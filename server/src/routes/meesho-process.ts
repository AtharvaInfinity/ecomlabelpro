import type { FastifyInstance } from 'fastify'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { extractMeeshoMetadata } from '../services/meesho-metadata.service.js'

const uploadDir = path.resolve(process.cwd(), 'data/uploads')
const outputDir = path.resolve(process.cwd(), 'data/outputs')

/*
 * Meesho source PDF supplied by the user:
 * A4 page, shipping label is the upper block and invoice starts below
 * "Fold Here".
 *
 * Source reference: 768 x 1024 px A4 preview.
 * Converted to 595.28 x 841.89 PDF points.
 *
 * Crop rectangle from the supplied 768 x 1024 PDF preview:
 *   left  = 12 px
 *   right = 756 px
 *   top   = 12 px
 *   bottom = 421 px from the top
 *
 * Stored as normalized ratios so the same crop scales to the actual PDF page.
 * This excludes the "Fold Here" separator and the tax invoice.
 */
const SOURCE_A4_WIDTH = 595.28
const SOURCE_A4_HEIGHT = 841.89

// Meesho source layout measured from the supplied 768 x 1024 invoice PDF:
// shipping label bounds use x=12..756, y=12..421 px; this leaves a clean margin and excludes the Fold Here dashed line.
// Use normalized fractions so the same crop works for 768x1024 test PDFs
// and standard A4-sized Meesho PDFs.
const CROP_LEFT_RATIO = 12 / 768
const CROP_RIGHT_RATIO = 756 / 768
const CROP_TOP_RATIO = 12 / 1024
const CROP_BOTTOM_TOPDOWN_RATIO = 421 / 1024

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const A4_MARGIN = 10
const A4_GAP = 8
const A4_COLUMNS = 2
const A4_ROWS = 2

const FOOTER_HEIGHT = 22
const FOOTER_FONT_SIZE = 8
const FOOTER_SIDE_PADDING = 8

type UploadedFile = {
  fileId: string
  fileName: string
  pages: number
}

type Body = {
  files: UploadedFile[]
  options?: {
    pickupSorting?: boolean
    skuSorting?: boolean
    orderNumber?: boolean
    originalFile?: boolean
    a4Printer?: boolean
    printText?: boolean
    customText?: string
  }
}

type LabelRecord = {
  fileIndex: number
  fileName: string
  sourceIndex: number
  pageNumber: number
  sku?: string
  pickup?: string
  sequenceNumber: number
}

function clampCrop(width: number, height: number) {
  const left = Math.max(0, Math.min(width - 1, width * CROP_LEFT_RATIO))
  const right = Math.max(
    left + 1,
    Math.min(width, width * CROP_RIGHT_RATIO),
  )
  const top = Math.max(0, Math.min(height, height * CROP_TOP_RATIO))
  const bottomTopDown = Math.max(
    top + 1,
    Math.min(height - 1, height * CROP_BOTTOM_TOPDOWN_RATIO),
  )
  const bottom = height - bottomTopDown

  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: height - top - bottom,
  }
}

function drawFooter(
  page: any,
  font: any,
  record: LabelRecord,
  options: NonNullable<Body['options']>,
  pageWidth: number,
) {
  const parts: string[] = []

  if (options.printText && options.customText?.trim()) {
    parts.push(options.customText.trim())
  }

  if (options.orderNumber) {
    parts.push(`Order ${record.sequenceNumber}`)
  }

  if (!parts.length) return

  const text = parts.join(' | ')

  page.drawText(text, {
    x: FOOTER_SIDE_PADDING,
    y: 7,
    size: FOOTER_FONT_SIZE,
    font,
    color: rgb(0, 0, 0),
    maxWidth: Math.max(100, pageWidth - FOOTER_SIDE_PADDING * 2),
  })
}

export async function meeshoProcessRoutes(app: FastifyInstance) {
  await fs.mkdir(uploadDir, { recursive: true })
  await fs.mkdir(outputDir, { recursive: true })

  app.post('/api/meesho/process', async (req, reply) => {
    try {
      const body = (req.body ?? {}) as Body

      if (!Array.isArray(body.files) || body.files.length === 0) {
        return reply.status(400).send({ message: 'No Meesho PDF files selected.' })
      }

      const options = {
        pickupSorting: Boolean(body.options?.pickupSorting),
        skuSorting: Boolean(body.options?.skuSorting),
        orderNumber: Boolean(body.options?.orderNumber),
        originalFile: Boolean(body.options?.originalFile),
        a4Printer: Boolean(body.options?.a4Printer),
        printText: Boolean(body.options?.printText),
        customText: body.options?.customText ?? '',
      }

      const labels: LabelRecord[] = []
      let sequence = 1

      for (let fileIndex = 0; fileIndex < body.files.length; fileIndex++) {
        const file = body.files[fileIndex]
        const inputPath = path.join(uploadDir, path.basename(file.fileId))
        const bytes = await fs.readFile(inputPath)
        const metadata = await extractMeeshoMetadata(new Uint8Array(bytes))

        for (let pageIndex = 0; pageIndex < file.pages; pageIndex++) {
          const pageMetadata = metadata[pageIndex] ?? {}

          labels.push({
            fileIndex,
            fileName: file.fileName,
            sourceIndex: pageIndex,
            pageNumber: pageIndex + 1,
            sku: pageMetadata.sku,
            pickup: pageMetadata.pickup,
            sequenceNumber: sequence++,
          })
        }
      }

      if (options.skuSorting) {
        labels.sort((a, b) =>
          (a.sku ?? '').localeCompare(b.sku ?? '', undefined, {
            numeric: true,
            sensitivity: 'base',
          }),
        )
      } else if (options.pickupSorting) {
        labels.sort((a, b) =>
          (a.pickup ?? '').localeCompare(b.pickup ?? '', undefined, {
            numeric: true,
            sensitivity: 'base',
          }),
        )
      }

      // Re-number AFTER sorting so Order 1, Order 2... follows output order.
      labels.forEach((label, index) => {
        label.sequenceNumber = index + 1
      })

      const output = await PDFDocument.create()
      const footerFont = await output.embedFont(StandardFonts.Helvetica)

      if (options.a4Printer) {
        let a4: any = null
        let slot = 0

        for (const record of labels) {
          if (slot === 0) {
            a4 = output.addPage([A4_WIDTH, A4_HEIGHT])
          }

          const sourceFile = body.files[record.fileIndex]
          const sourceBytes = await fs.readFile(
            path.join(uploadDir, path.basename(sourceFile.fileId)),
          )
          const source = await PDFDocument.load(sourceBytes)
          const sourcePage = source.getPage(record.sourceIndex)
          const { width, height } = sourcePage.getSize()
          const crop = clampCrop(width, height)

          const embedded = await output.embedPage(sourcePage, {
            left: crop.left,
            bottom: crop.bottom,
            right: crop.right,
            top: height - crop.top,
          })

          const col = slot % A4_COLUMNS
          const row = Math.floor(slot / A4_COLUMNS)
          const cellWidth =
            (A4_WIDTH - A4_MARGIN * 2 - A4_GAP) / A4_COLUMNS
          const cellHeight =
            (A4_HEIGHT - A4_MARGIN * 2 - A4_GAP) / A4_ROWS

          const scale = Math.min(
            (cellWidth - 4) / crop.width,
            (cellHeight - 24) / crop.height,
          )

          const drawWidth = crop.width * scale
          const drawHeight = crop.height * scale
          const x =
            A4_MARGIN +
            col * (cellWidth + A4_GAP) +
            (cellWidth - drawWidth) / 2
          const y =
            A4_HEIGHT -
            A4_MARGIN -
            (row + 1) * cellHeight -
            row * A4_GAP +
            (cellHeight - drawHeight) / 2 +
            10

          a4.drawPage(embedded, {
            x,
            y,
            width: drawWidth,
            height: drawHeight,
          })

          if (options.printText || options.orderNumber) {
            drawFooter(a4, footerFont, record, options, cellWidth)
          }

          slot++

          if (slot === 4) slot = 0
        }
      } else {
        for (const record of labels) {
          const sourceFile = body.files[record.fileIndex]
          const sourceBytes = await fs.readFile(
            path.join(uploadDir, path.basename(sourceFile.fileId)),
          )
          const source = await PDFDocument.load(sourceBytes)
          const sourcePage = source.getPage(record.sourceIndex)
          const { width, height } = sourcePage.getSize()

          // Original file option: keep the whole source page instead of cropping.
          if (options.originalFile) {
            const [copied] = await output.copyPages(source, [record.sourceIndex])
            output.addPage(copied)
            continue
          }

          const crop = clampCrop(width, height)
          const footer =
            options.printText || options.orderNumber ? FOOTER_HEIGHT : 0

          const page = output.addPage([
            crop.width,
            crop.height + footer,
          ])

          const embedded = await output.embedPage(sourcePage, {
            left: crop.left,
            bottom: crop.bottom,
            right: crop.right,
            top: height - crop.top,
          })

          page.drawPage(embedded, {
            x: 0,
            y: footer,
            width: crop.width,
            height: crop.height,
          })

          drawFooter(page, footerFont, record, options, crop.width)
        }
      }

      const outputId = `${crypto.randomUUID()}.pdf`
      const outputPath = path.join(outputDir, outputId)
      await fs.writeFile(
        outputPath,
        await output.save({ useObjectStreams: true }),
      )

      return reply.send({
        pages: output.getPageCount(),
        filename: 'meesho-shipping-labels.pdf',
        downloadUrl: `/api/pdf/download/${outputId}`,
        labels: labels.length,
        sortedBySku: options.skuSorting,
        sortedByPickup: options.pickupSorting,
        printedOrderNumber: options.orderNumber,
        printedText: options.printText,
        customText: options.printText ? options.customText : '',
      })
    } catch (error) {
      req.log.error(error)
      return reply.status(500).send({
        message:
          error instanceof Error
            ? error.message
            : 'Meesho processing failed.',
      })
    }
  })
}
