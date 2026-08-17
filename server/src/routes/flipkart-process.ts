import type { FastifyInstance } from 'fastify'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { extractFlipkartMetadataForPages } from '../services/flipkart-metadata.service.js'
import { materializeUploads, getLocalUploadPath, saveOutput } from '../services/storage.service.js'

const uploadDir = process.env.VERCEL
  ? '/tmp/ecom-label-pro/uploads'
  : path.resolve(process.cwd(), 'data/uploads')
const outputDir = process.env.VERCEL
  ? '/tmp/ecom-label-pro/outputs'
  : path.resolve(process.cwd(), 'data/outputs')

// Flipkart source pages are A4 (595 x 842 pt). The shipping label is a
// centered block near the top of the page. We crop ONLY that block so the
// generated PDF has the same physical label size as the original label.
// These coordinates are based on the supplied Flipkart invoice PDF.
// Small print-safe padding around the original Flipkart label.
// The label artwork itself is NOT scaled or redrawn; these values only
// include a little more of the surrounding white area in the output PDF.
const CROP_LEFT = 189
const CROP_RIGHT = 405
const CROP_TOP = 21
const DEFAULT_LABEL_BOTTOM_TOPDOWN = 382
const LABEL_SEPARATOR_GAP = 2

// Optional custom message gets a small footer OUTSIDE the original label.
// The original Flipkart label artwork is never scaled, shifted, or covered.
const PRINT_TEXT_HEIGHT = 20
const PRINT_TEXT_FONT_SIZE = 8
const LABEL_SIDE_PADDING = 5
const LABEL_FOOTER_GAP = 3

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const A4_MARGIN = 8
const A4_GAP = 6
const A4_COLUMNS = 2
const A4_ROWS = 2
const A4_PER_PAGE = 4

type UploadedFile = { fileId: string; fileName: string; pages: number }
type Body = {
  files: UploadedFile[]
  options?: {
    orderNumber?: boolean
    skuSorting?: boolean
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
  orderNumber?: string
  sku?: string
  cropBottomTopDown: number
  sequenceNumber?: number
}

function safeCropBottom(pageHeight: number, detectedBottom?: number) {
  const candidate = detectedBottom ?? DEFAULT_LABEL_BOTTOM_TOPDOWN
  return Math.max(CROP_TOP + 100, Math.min(pageHeight - 20, candidate))
}

/**
 * The Flipkart source is an A4 invoice with the shipping label positioned at
 * a fixed, centered location. The label boundary is stable across the
 * supplied pages, so use the physical PDF coordinates rather than OCR/text
 * detection. This prevents invoice GST/PAN/order/invoice content from ever
 * entering the output.
 */
async function detectLabelBottomTopDown(
  _pdfBytes: Uint8Array,
  _pageNumber: number,
  pageHeight: number,
) {
  // A4 source: label bottom is ~390 pt from the top, including a small bottom
  // print-safe margin. If another page size is supplied, preserve the same proportion.
  if (Math.abs(pageHeight - A4_HEIGHT) < 5) {
    return DEFAULT_LABEL_BOTTOM_TOPDOWN
  }
  return safeCropBottom(pageHeight, pageHeight * (DEFAULT_LABEL_BOTTOM_TOPDOWN / A4_HEIGHT))
}

function drawBottomOptions(
  page: any,
  options: NonNullable<Body['options']>,
  record: LabelRecord,
  labelX: number,
  labelWidth: number,
  y: number,
  font: any,
) {
  const customText = options.printText ? (options.customText ?? '').trim() : ''
  const orderText = options.orderNumber && record.sequenceNumber
    ? `Order ${record.sequenceNumber}`
    : ''

  if (!customText && !orderText) return

  const size = PRINT_TEXT_FONT_SIZE
  const sidePadding = LABEL_SIDE_PADDING
  // Align both footer items to the ACTUAL drawn label, not the A4 cell.
  // This keeps custom text and Order N on one baseline and inside the label width.
  const leftX = labelX + sidePadding
  const rightEdge = labelX + labelWidth - sidePadding

  // Footer belongs to THIS A4 cell. cellX is essential for the right-hand
  // column and bottom row; without it, footer text was drawn into column 1.
  if (customText) {
    page.drawText(customText, {
      x: leftX,
      y,
      size,
      font,
      color: rgb(0, 0, 0),
      maxWidth: Math.max(40, labelWidth / 2 - sidePadding * 2),
    })
  }

  if (orderText) {
    const orderWidth = font.widthOfTextAtSize(orderText, size)
    page.drawText(orderText, {
      x: Math.max(leftX, rightEdge - orderWidth),
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    })
  }
}

export async function flipkartProcessRoutes(app: FastifyInstance) {
  await fs.mkdir(outputDir, { recursive: true })

  app.post('/api/flipkart/process', async (req, reply) => {
    try {
      const body = (req.body ?? {}) as Body
      if (!Array.isArray(body.files) || body.files.length === 0) {
        return reply.status(400).send({ message: 'No Flipkart PDF files selected.' })
      }

      const options = {
        orderNumber: Boolean(body.options?.orderNumber),
        skuSorting: Boolean(body.options?.skuSorting),
        a4Printer: Boolean(body.options?.a4Printer),
        printText: Boolean(body.options?.printText),
        customText: String(body.options?.customText ?? '').trim(),
      }

      if (options.printText && !options.customText) {
        return reply.status(400).send({ message: 'Please enter the text you want to print on the label.' })
      }

      await materializeUploads(body.files)

      const labels: LabelRecord[] = []

      for (let fileIndex = 0; fileIndex < body.files.length; fileIndex++) {
        const file = body.files[fileIndex]
        const inputPath = getLocalUploadPath(file.fileId)
        const bytes = await fs.readFile(inputPath)
        const source = await PDFDocument.load(bytes)
        const pageCount = source.getPageCount()
        const pdfData = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)

        const pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1)
        const metadata = await extractFlipkartMetadataForPages(pdfData, pageNumbers)

        for (let i = 0; i < pageCount; i++) {
          const pageNumber = i + 1
          const sourcePage = source.getPage(i)
          const { height } = sourcePage.getSize()
          const m = metadata.get(pageNumber)
          const cropBottomTopDown = await detectLabelBottomTopDown(
            pdfData,
            pageNumber,
            height,
          )

          labels.push({
            fileIndex,
            fileName: file.fileName,
            sourceIndex: i,
            pageNumber,
            orderNumber: m?.orderNumber,
            sku: m?.sku,
            cropBottomTopDown,
          })
        }
      }

      if (!labels.length) {
        return reply.status(400).send({ message: 'No Flipkart label pages were found.' })
      }

      if (options.skuSorting) {
        labels.sort((a, b) => {
          const aSku = (a.sku ?? '').trim()
          const bSku = (b.sku ?? '').trim()
          if (!aSku && !bSku) return a.fileIndex - b.fileIndex || a.sourceIndex - b.sourceIndex
          if (!aSku) return 1
          if (!bSku) return -1
          return aSku.localeCompare(bSku, undefined, { numeric: true, sensitivity: 'base' })
        })
      }

      // Assign sequential order numbers after any SKU sorting.
      // Every generated label therefore receives 1, 2, 3, ... in the exact
      // order it appears in the final PDF.
      if (options.orderNumber) {
        labels.forEach((label, index) => {
          label.sequenceNumber = index + 1
        })
      }

      const output = await PDFDocument.create()
      const font = await output.embedFont(StandardFonts.Helvetica)

      if (options.a4Printer) {
        const cellWidth = (A4_WIDTH - A4_MARGIN * 2 - A4_GAP) / 2
        const cellHeight = (A4_HEIGHT - A4_MARGIN * 2 - A4_GAP) / 2
        const dividerX = A4_WIDTH / 2
        const dividerY = A4_HEIGHT / 2

        for (let start = 0; start < labels.length; start += A4_PER_PAGE) {
          const a4 = output.addPage([A4_WIDTH, A4_HEIGHT])
const batch = labels.slice(start, start + A4_PER_PAGE)
          for (let slot = 0; slot < batch.length; slot++) {
            const record = batch[slot]
            const sourceFile = body.files[record.fileIndex]
            const sourceBytes = await fs.readFile(getLocalUploadPath(sourceFile.fileId))
            const source = await PDFDocument.load(sourceBytes)
            const sourcePage = source.getPage(record.sourceIndex)
            const sourceWidth = sourcePage.getWidth()
            const sourceHeight = sourcePage.getHeight()
            const cropLeft = Math.max(0, Math.min(sourceWidth - 1, CROP_LEFT))
            const cropRight = Math.max(cropLeft + 1, Math.min(sourceWidth, CROP_RIGHT))
            const cropTop = Math.max(0, Math.min(sourceHeight, CROP_TOP))
            const cropBottomTopDown = Math.max(cropTop + 1, Math.min(sourceHeight, record.cropBottomTopDown))
            const cropBottom = sourceHeight - cropBottomTopDown
            const cropWidth = Math.max(1, cropRight - cropLeft)
            const cropHeight = Math.max(1, sourceHeight - cropTop - cropBottom)
            const embedded = await output.embedPage(sourcePage, {
              left: cropLeft,
              bottom: cropBottom,
              right: cropRight,
              top: sourceHeight - cropTop,
            })
            const hasFooter = options.printText || options.orderNumber
            const footerHeight = hasFooter ? PRINT_TEXT_HEIGHT : 0
            const availableHeight = cellHeight - footerHeight - LABEL_FOOTER_GAP - 4
            const scale = Math.min((cellWidth - 8) / cropWidth, availableHeight / cropHeight)
            const drawWidth = cropWidth * scale
            const drawHeight = cropHeight * scale
            const col = slot % A4_COLUMNS
            const row = Math.floor(slot / A4_COLUMNS)
            const cellX = A4_MARGIN + col * (cellWidth + A4_GAP)
            const cellY = A4_HEIGHT - A4_MARGIN - (row + 1) * cellHeight - row * A4_GAP
            const drawX = cellX + (cellWidth - drawWidth) / 2
            const drawY = cellY + footerHeight + LABEL_FOOTER_GAP + (availableHeight - drawHeight) / 2

            // Keep every label centered inside its own A4 quadrant.
            a4.drawPage(embedded, {
              x: drawX,
              y: drawY,
              width: drawWidth,
              height: drawHeight,
            })

            if (hasFooter) {
              // One shared baseline for both custom text and Order N.
              // Keep it just below the actual label artwork.
              const footerY = Math.max(cellY + 4, drawY - 10)
drawBottomOptions(a4, options, record, drawX, drawWidth, footerY, font)
            }
          }
        }
      } else {
        for (const record of labels) {
          const sourceFile = body.files[record.fileIndex]
          const sourceBytes = await fs.readFile(getLocalUploadPath(sourceFile.fileId))
          const source = await PDFDocument.load(sourceBytes)
          const sourcePage = source.getPage(record.sourceIndex)
          const { width: sourceWidth, height: sourceHeight } = sourcePage.getSize()
          const cropLeft = Math.max(0, Math.min(sourceWidth - 1, CROP_LEFT))
          const cropRight = Math.max(cropLeft + 1, Math.min(sourceWidth, CROP_RIGHT))
          const cropTop = Math.max(0, Math.min(sourceHeight, CROP_TOP))
          const cropBottomTopDown = Math.max(cropTop + 1, Math.min(sourceHeight, record.cropBottomTopDown))
          const cropBottom = sourceHeight - cropBottomTopDown
          const cropWidth = Math.max(1, cropRight - cropLeft)
          const cropHeight = Math.max(1, sourceHeight - cropTop - cropBottom)
          const textArea = (options.printText || options.orderNumber) ? PRINT_TEXT_HEIGHT : 0
          const page = output.addPage([cropWidth, cropHeight + textArea])
          const embedded = await output.embedPage(sourcePage, {
            left: cropLeft,
            bottom: cropBottom,
            right: cropRight,
            top: sourceHeight - cropTop,
          })

          // The embedded page is exactly the physical Flipkart label crop.
          // It is drawn 1:1 so the label is not zoomed, shrunk, or shifted.
          page.drawPage(embedded, {
            x: 0,
            y: textArea,
            width: cropWidth,
            height: cropHeight,
          })

          drawBottomOptions(page, options, record, 0, cropWidth, 5, font)
        }
      }

      const savedOutput = await saveOutput(
        await output.save({ useObjectStreams: true }),
        'flipkart-shipping-labels.pdf',
      )

      return reply.send({
        pages: output.getPageCount(),
        filename: 'flipkart-shipping-labels.pdf',
        downloadUrl: savedOutput.downloadUrl,
        labels: labels.length,
        sortedBySku: options.skuSorting,
        printedOrderNumber: options.orderNumber,
        printedText: options.printText,
        customText: options.printText ? options.customText : '',
      })
    } catch (error) {
      req.log.error(error)
      return reply.status(500).send({ message: error instanceof Error ? error.message : 'Flipkart processing failed.' })
    }
  })
}
