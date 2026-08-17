import type { FastifyInstance } from 'fastify'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { extractAmazonMetadataForPages } from '../services/amazon-metadata.service.js'

const uploadDir = path.resolve(process.cwd(), 'data/uploads')
const outputDir = path.resolve(process.cwd(), 'data/outputs')

const RIGHT_PRINT_SAFE_SPACE = 36
const NORMAL_BOTTOM_SPACE = 8
const EXTRA_BOTTOM_SPACE = 12

// Small crop around the original Amazon label. The source PDF has a
// little white border on the top/left; remove it without changing the
// actual label artwork size.
const CROP_LEFT = 12
const CROP_TOP = 10
const CROP_RIGHT = 8
const CROP_BOTTOM = 0

/*
 * Extra-space mode uses the EXISTING blank area of the Amazon label.
 * It must not enlarge the PDF page or shrink/zoom the label artwork.
 */
const SINGLE_METADATA_Y_NORMAL = 6
const SINGLE_METADATA_Y_EXTRA = 6
const A4_METADATA_Y = -2

/*
 * SKU / ASIN position on every label.
 * Increase LEFT if the text should move further right.
 * Increase GAP if you want more empty space above SKU/ASIN.
 */
const METADATA_LEFT = 25
const SINGLE_METADATA_LEFT = 45
const METADATA_BOTTOM_PADDING = 4
const METADATA_FONT_SIZE = 8.5
const METADATA_LINE_HEIGHT = 10
const SINGLE_LABEL_RIGHT_SAFE_SPACE = 6

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const A4_MARGIN = 12
const A4_GAP = 8
const A4_COLUMNS = 2
const A4_ROWS = 2
const A4_PER_PAGE = 4

/* Visual dividers between the four A4 label positions. */
const A4_DIVIDER_WIDTH = 0.6
const A4_DIVIDER_COLOR = rgb(0.72, 0.72, 0.72)

type UploadedFile = {
  fileId: string
  fileName: string
  pages: number
}

type Body = {
  files: UploadedFile[]
  options?: {
    mode?: 'remove-invoice' | 'remove-invoice-extra'
    a4Printer?: boolean
    skuSorting?: boolean
    printSku?: boolean
    printAsin?: boolean
    bottomExtraSpace?: number
    rightExtraSpace?: number
  }
}

type LabelRecord = {
  fileIndex: number
  fileName: string
  sourceIndex: number
  originalPageNumber: number
  sku?: string
  asin?: string
}

export async function processRoutes(app: FastifyInstance) {
  await fs.mkdir(uploadDir, { recursive: true })
  await fs.mkdir(outputDir, { recursive: true })

  app.post('/api/pdf/process', async (req, reply) => {
    try {
      const body = (req.body ?? {}) as Body

      if (!Array.isArray(body.files) || body.files.length === 0) {
        return reply.status(400).send({
          message: 'No PDF files selected.',
        })
      }

      const options = {
        mode: body.options?.mode ?? 'remove-invoice',
        a4Printer: Boolean(body.options?.a4Printer),
        skuSorting: Boolean(body.options?.skuSorting),
        printSku: Boolean(body.options?.printSku),
        printAsin: Boolean(body.options?.printAsin),
      }

      const labels: LabelRecord[] = []
      const allLabelPages: number[] = []
      const allInvoicePages: number[] = []

      /*
       * Read every uploaded PDF once.
       *
       * Amazon PDF structure used by your files:
       *   odd PDF page  = shipping label
       *   even PDF page = matching invoice
       *
       * We extract metadata from ALL invoice pages first and then
       * attach it to the matching label. This prevents the previous
       * problem where metadata was only appearing on the first label.
       */
      for (let fileIndex = 0; fileIndex < body.files.length; fileIndex++) {
        const file = body.files[fileIndex]

        if (!file?.fileId) continue

        const safeId = path.basename(file.fileId)
        const inputPath = path.join(uploadDir, safeId)
        const bytes = await fs.readFile(inputPath)
        const source = await PDFDocument.load(bytes)
        const pageCount = source.getPageCount()

        const pdfData = new Uint8Array(
          bytes.buffer,
          bytes.byteOffset,
          bytes.byteLength,
        )

        const labelIndexes: number[] = []
        const invoiceIndexes: number[] = []

        for (let i = 0; i < pageCount; i++) {
          if (i % 2 === 0) {
            labelIndexes.push(i)
            allLabelPages.push(i + 1)
          } else {
            invoiceIndexes.push(i)
            allInvoicePages.push(i + 1)
          }
        }

        /*
         * Extract every invoice page in one PDF.js document session.
         * This is much more reliable than repeatedly opening/destroying
         * PDF.js for every page.
         */
        let metadataByInvoicePage = new Map<
          number,
          { sku?: string; asin?: string }
        >()

        if (
          options.printSku ||
          options.printAsin ||
          options.skuSorting
        ) {
          metadataByInvoicePage =
            await extractAmazonMetadataForPages(
              pdfData,
              invoiceIndexes.map((index) => index + 1),
            )
        }

        for (const labelIndex of labelIndexes) {
          const labelPageNumber = labelIndex + 1
          const invoicePageNumber = labelPageNumber + 1
          const metadata =
            metadataByInvoicePage.get(invoicePageNumber)

          labels.push({
            fileIndex,
            fileName: file.fileName,
            sourceIndex: labelIndex,
            originalPageNumber: labelPageNumber,
            sku: metadata?.sku,
            asin: metadata?.asin,
          })

          req.log.info(
            {
              file: file.fileName,
              labelPage: labelPageNumber,
              invoicePage: invoicePageNumber,
              sku: metadata?.sku ?? null,
              asin: metadata?.asin ?? null,
            },
            'Amazon label metadata mapped',
          )
        }
      }

      if (labels.length === 0) {
        return reply.status(400).send({
          message: 'No shipping label pages were found.',
        })
      }

      /* Natural SKU sorting across ALL uploaded PDFs. */
      if (options.skuSorting) {
        labels.sort((a, b) => {
          const aSku = (a.sku ?? '').trim()
          const bSku = (b.sku ?? '').trim()

          if (!aSku && !bSku) {
            return (
              a.fileIndex - b.fileIndex ||
              a.sourceIndex - b.sourceIndex
            )
          }

          if (!aSku) return 1
          if (!bSku) return -1

          return aSku.localeCompare(bSku, undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        })
      }

      const metadataRequested =
        options.printSku ||
        options.printAsin ||
        options.skuSorting

      const metadataDetected = labels.filter(
        (label) => Boolean(label.sku || label.asin),
      ).length

      const metadataMissing = metadataRequested
        ? labels.length - metadataDetected
        : 0

      const output = await PDFDocument.create()

      /*
       * Create the output.
       *
       * Normal mode: one copied label page per output page.
       * A4 mode: four labels are placed on one A4 sheet (2 x 2).
       */
      if (options.a4Printer) {
        /*
         * A4 reference layout: exactly four independent label cells,
         * 2 columns x 2 rows, with a thin cross divider.
         *
         * Each cell gets its own reserved metadata area so SKU/ASIN
         * can never overlap the Amazon label artwork.
         */
        for (
          let batchStart = 0;
          batchStart < labels.length;
          batchStart += A4_PER_PAGE
        ) {
          const a4Page = output.addPage([
            A4_WIDTH,
            A4_HEIGHT,
          ])

          const cellWidth =
            (A4_WIDTH - A4_MARGIN * 2 - A4_GAP) /
            A4_COLUMNS

          const cellHeight =
            (A4_HEIGHT - A4_MARGIN * 2 - A4_GAP) /
            A4_ROWS

          const dividerX = A4_WIDTH / 2
          const dividerY = A4_HEIGHT / 2

          a4Page.drawLine({
            start: { x: dividerX, y: 0 },
            end: { x: dividerX, y: A4_HEIGHT },
            thickness: A4_DIVIDER_WIDTH,
            color: A4_DIVIDER_COLOR,
          })

          a4Page.drawLine({
            start: { x: 0, y: dividerY },
            end: { x: A4_WIDTH, y: dividerY },
            thickness: A4_DIVIDER_WIDTH,
            color: A4_DIVIDER_COLOR,
          })

          const batch = labels.slice(
            batchStart,
            batchStart + A4_PER_PAGE,
          )

          for (let slot = 0; slot < batch.length; slot++) {
            const record = batch[slot]
            const sourceFile = body.files[record.fileIndex]
            if (!sourceFile?.fileId) continue

            const sourcePath = path.join(
              uploadDir,
              path.basename(sourceFile.fileId),
            )
            const sourceBytes = await fs.readFile(sourcePath)

            const embeddedPages = await output.embedPdf(
              new Uint8Array(
                sourceBytes.buffer,
                sourceBytes.byteOffset,
                sourceBytes.byteLength,
              ),
              [record.sourceIndex],
            )

            const embedded = embeddedPages[0]
            if (!embedded) {
              throw new Error(
                `Could not embed label page ${record.originalPageNumber} from ${record.fileName}.`,
              )
            }

            const sourceWidth = embedded.width
            const sourceHeight = embedded.height

            if (
              !Number.isFinite(sourceWidth) ||
              !Number.isFinite(sourceHeight) ||
              sourceWidth <= 0 ||
              sourceHeight <= 0
            ) {
              throw new Error(
                `Invalid label dimensions on page ${record.originalPageNumber} from ${record.fileName}.`,
              )
            }

            const col = slot % A4_COLUMNS
            const row = Math.floor(slot / A4_COLUMNS)

            const cellX =
              A4_MARGIN + col * (cellWidth + A4_GAP)

            const cellY =
              A4_HEIGHT -
              A4_MARGIN -
              (row + 1) * cellHeight -
              row * A4_GAP

            const metadataWanted =
              options.printSku || options.printAsin

            /*
             * Crop only the small white border around the source label.
             * This makes the label content fill the A4 cell more naturally
             * without adding an artificial blank strip or shrinking the
             * actual Amazon artwork.
             */
            const cropWidth =
              Math.max(1, sourceWidth - CROP_LEFT - CROP_RIGHT)
            const cropHeight =
              Math.max(1, sourceHeight - CROP_TOP - CROP_BOTTOM)

            const scale = Math.min(
              (cellWidth - 4) / cropWidth,
              (cellHeight - 4) / cropHeight,
            )

            if (!Number.isFinite(scale) || scale <= 0) {
              throw new Error(
                `Could not calculate A4 scale for page ${record.originalPageNumber}.`,
              )
            }

            const drawWidth = cropWidth * scale
            const drawHeight = cropHeight * scale

            const drawX =
              cellX +
              (cellWidth - drawWidth) / 2

            const drawY =
              cellY +
              (cellHeight - drawHeight) / 2

            /*
             * drawPage cannot clip to a cell, so use a page-level white
             * background and keep the source inside the calculated bounds.
             * The crop values are also reflected in the metadata position.
             */
            a4Page.drawPage(embedded, {
              x: drawX - CROP_LEFT * scale,
              y: drawY - CROP_BOTTOM * scale,
              width: sourceWidth * scale,
              height: sourceHeight * scale,
            })

            await drawMetadataOnA4Label(
              output,
              a4Page,
              record,
              options,
              cellX,
              cellY,
              cellWidth,
              metadataWanted,
            )
          }
        }
      } else {
        /*
         * SINGLE LABEL MODE
         *
         * Make a new page with a real bottom metadata area.
         * The original Amazon label is fitted into the upper content
         * area and SKU/ASIN are drawn in the reserved blank area.
         * This guarantees consistent spacing and prevents overlap.
         */
        for (const record of labels) {
          const sourceFile = body.files[record.fileIndex]
          if (!sourceFile?.fileId) continue

          const sourcePath = path.join(
            uploadDir,
            path.basename(sourceFile.fileId),
          )
          const sourceBytes = await fs.readFile(sourcePath)
          const source = await PDFDocument.load(sourceBytes)
          const sourcePage = source.getPage(record.sourceIndex)
          const { width, height } = sourcePage.getSize()

          const metadataWanted =
            options.printSku || options.printAsin

          /*
           * Keep the Amazon artwork at its original scale, but trim the
           * small white border around the page. This removes the visible
           * top/left blank margin without zooming the label artwork.
           *
           * Extra-space mode uses the existing white area at the bottom;
           * it does NOT enlarge the page or create a large blank strip.
           */
          const outputPageWidth =
            Math.max(1, width - CROP_LEFT - CROP_RIGHT) +
            SINGLE_LABEL_RIGHT_SAFE_SPACE

          const outputPageHeight =
            Math.max(1, height - CROP_TOP - CROP_BOTTOM)

          const page = output.addPage([
            outputPageWidth,
            outputPageHeight,
          ])

          const embeddedPages = await output.embedPdf(
            new Uint8Array(
              sourceBytes.buffer,
              sourceBytes.byteOffset,
              sourceBytes.byteLength,
            ),
            [record.sourceIndex],
          )

          const embedded = embeddedPages[0]
          if (!embedded) {
            throw new Error(
              `Could not embed label page ${record.originalPageNumber} from ${record.fileName}.`,
            )
          }

          const drawWidth = width
          const drawHeight = height

          /*
           * Shift the original page left/up so the page boundary crops the
           * source's top and left white border. PDF viewers clip content
           * outside the page, so no embedPage/boundingBox operation is
           * needed here. This avoids the previous embeddedPage/NaN issue.
           */
          const drawX = -CROP_LEFT
          const drawY = -CROP_BOTTOM

          page.drawPage(embedded, {
            x: drawX,
            y: drawY,
            width: drawWidth,
            height: drawHeight,
          })


          await drawMetadataOnSingleLabel(
            output,
            page,
            record,
            options,
            drawX,
            metadataWanted,
            drawWidth,
            options.mode,
          )
        }
      }

      const expectedOutputPages = options.a4Printer
        ? Math.ceil(labels.length / A4_PER_PAGE)
        : labels.length

      if (output.getPageCount() !== expectedOutputPages) {
        throw new Error(
          `Output page count mismatch. Expected ${expectedOutputPages}, created ${output.getPageCount()}.`,
        )
      }

      const outputId = `${crypto.randomUUID()}.pdf`
      const outputPath = path.join(outputDir, outputId)

      const outputBytes = await output.save({
        useObjectStreams: true,
      })

      await fs.writeFile(
        outputPath,
        outputBytes,
      )

      return reply.send({
        pages: output.getPageCount(),
        filename: 'amazon-shipping-labels.pdf',
        downloadUrl: `/api/pdf/download/${outputId}`,
        files: body.files.length,
        labelPages: allLabelPages,
        invoicePages: allInvoicePages,
        sortedBySku: options.skuSorting,
        printSku: options.printSku,
        printAsin: options.printAsin,
        metadataDetected,
        metadataMissing,
      })
    } catch (error) {
      req.log.error(error)

      return reply.status(500).send({
        message:
          error instanceof Error
            ? error.message
            : 'Processing failed.',
      })
    }
  })
}

function bottomSpaceForMode(
  mode: 'remove-invoice' | 'remove-invoice-extra',
): number {
  return mode === 'remove-invoice-extra'
    ? EXTRA_BOTTOM_SPACE
    : NORMAL_BOTTOM_SPACE
}

async function drawMetadataOnA4Label(
  document: PDFDocument,
  page: any,
  record: LabelRecord,
  options: {
    printSku: boolean
    printAsin: boolean
  },
  cellX: number,
  cellY: number,
  cellWidth: number,
  metadataWanted: boolean,
) {
  const lines = metadataLines(record, options)
  if (lines.length === 0 || !metadataWanted) return

  const font = await document.embedFont(
    StandardFonts.Helvetica,
  )

  const lineHeight = METADATA_LINE_HEIGHT
  const fontSize = METADATA_FONT_SIZE

  const y =
    cellY + A4_METADATA_Y + METADATA_BOTTOM_PADDING

  const x = cellX + METADATA_LEFT

  for (const line of lines) {
    page.drawText(line, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
      maxWidth: Math.max(
        60,
        cellWidth - METADATA_LEFT - 12,
      ),
    })
  }
}

async function drawMetadataOnSingleLabel(
  document: PDFDocument,
  page: any,
  record: LabelRecord,
  options: {
    printSku: boolean
    printAsin: boolean
  },
  drawX: number,
  metadataWanted: boolean,
  drawWidth: number,
  mode: 'remove-invoice' | 'remove-invoice-extra',
) {
  const lines = metadataLines(record, options)
  if (lines.length === 0 || !metadataWanted) return

  const font = await document.embedFont(
    StandardFonts.Helvetica,
  )

  /*
   * The metadata is deliberately kept compact and low in the existing
   * footer area. Both modes use the same visual position; the option only
   * changes invoice removal behavior, not label scale.
   */
  const y =
    mode === 'remove-invoice-extra'
      ? SINGLE_METADATA_Y_EXTRA
      : SINGLE_METADATA_Y_NORMAL

  const x = SINGLE_METADATA_LEFT

  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - index * METADATA_LINE_HEIGHT,
      size: METADATA_FONT_SIZE,
      font,
      color: rgb(0, 0, 0),
      maxWidth: Math.max(
        80,
        drawWidth - METADATA_LEFT - 20,
      ),
    })
  })
}

function metadataLines(
  record: LabelRecord,
  options: {
    printSku: boolean
    printAsin: boolean
  },
): string[] {
  /*
   * When both options are selected, keep SKU + ASIN on ONE line
   * in the requested format:
   *
   * PNTR_AppamPan_7pit | B0H6HZM14M
   *
   * This avoids the old two-line "SKU:" / "ASIN:" block and keeps
   * the metadata compact inside the reserved label space.
   */
  if (
    options.printSku &&
    options.printAsin
  ) {
    if (record.sku && record.asin) {
      return [
        `${record.sku} | ${record.asin}`,
      ]
    }

    if (record.sku) {
      return [record.sku]
    }

    if (record.asin) {
      return [record.asin]
    }

    return []
  }

  if (options.printSku && record.sku) {
    return [record.sku]
  }

  if (options.printAsin && record.asin) {
    return [record.asin]
  }

  return []
}
