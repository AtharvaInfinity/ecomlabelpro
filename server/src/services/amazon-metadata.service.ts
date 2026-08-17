import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

export type AmazonMetadata = {
  sku?: string
  asin?: string
  itemType?: string
  text: string
}

function normalizeText(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanValue(value: string | undefined): string | undefined {
  if (!value) return undefined

  const cleaned = value
    .trim()
    .replace(/^[:#\-\s]+/, '')
    .replace(/[\s]+$/, '')

  if (!cleaned) return undefined

  if (/^(n\/?a|na|none|null|unknown|-+)$/i.test(cleaned)) {
    return undefined
  }

  return cleaned
}

function extractAsin(text: string): string | undefined {
  const patterns = [
    /\b(?:product\s*)?asin\s*[:#-]?\s*([A-Z0-9]{10})\b/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    const value = cleanValue(match?.[1])?.toUpperCase()

    if (value && /^[A-Z0-9]{10}$/.test(value)) {
      return value
    }
  }

  /* Amazon invoice format: ASIN ( SKU ) */
  const asinBeforeSku = text.match(
    /\b([A-Z0-9]{10})\s*\(\s*[^()]{1,120}\s*\)/i,
  )

  const value = cleanValue(asinBeforeSku?.[1])?.toUpperCase()

  if (value && /^[A-Z0-9]{10}$/.test(value)) {
    return value
  }

  return undefined
}

function extractSku(text: string): string | undefined {
  const explicitPatterns = [
    /\b(?:seller\s*)?sku\s*[:#-]?\s*([A-Za-z0-9][A-Za-z0-9._:/-]{0,100})\b/i,
    /\bmerchant\s*sku\s*[:#-]?\s*([A-Za-z0-9][A-Za-z0-9._:/-]{0,100})\b/i,
  ]

  for (const pattern of explicitPatterns) {
    const match = text.match(pattern)
    const value = cleanValue(match?.[1])
    if (value) return value
  }

  /*
   * Amazon India invoice format:
   *
   * B0H6HZM14M ( PNTR_AppamPan_7pit )
   *
   * The SKU can be on the next PDF text line. The normalized
   * text joins PDF text items with spaces, so this regex handles
   * both same-line and split-line cases.
   */
  const asinSku = text.match(
    /\b[A-Z0-9]{10}\s*\(\s*([^()]{1,120})\s*\)/i,
  )

  const value = cleanValue(asinSku?.[1])
  if (value) return value

  return undefined
}

function extractItemType(text: string): string | undefined {
  const match = text.match(
    /\bITEM\s*TYPE\s+([A-Za-z0-9][A-Za-z0-9._:/-]{1,100})/i,
  )

  return cleanValue(match?.[1])
}

function toUint8Array(
  pdfBytes: Uint8Array | Buffer,
): Uint8Array {
  return new Uint8Array(
    pdfBytes.buffer,
    pdfBytes.byteOffset,
    pdfBytes.byteLength,
  )
}

async function extractPageText(
  document: any,
  pageNumber: number,
): Promise<string> {
  const page = await document.getPage(pageNumber)
  const content = await page.getTextContent()

  return normalizeText(
    content.items
      .map((item: any) =>
        typeof item?.str === 'string'
          ? item.str
          : '',
      )
      .filter(Boolean)
      .join(' '),
  )
}

/**
 * Extract metadata from ALL requested invoice pages using one
 * PDF.js document. This is important for multi-label Amazon PDFs.
 */
export async function extractAmazonMetadataForPages(
  pdfBytes: Uint8Array | Buffer,
  pageNumbers: number[],
): Promise<Map<number, AmazonMetadata>> {
  const data = toUint8Array(pdfBytes)

  const loadingTask = pdfjsLib.getDocument({
    data,
    disableWorker: true,
    useSystemFonts: true,
    verbosity: 0,
  })

  const result = new Map<number, AmazonMetadata>()

  try {
    const document = await loadingTask.promise

    for (const pageNumber of pageNumbers) {
      try {
        const text = await extractPageText(
          document,
          pageNumber,
        )

        const metadata: AmazonMetadata = {
          text,
          sku: extractSku(text),
          asin: extractAsin(text),
          itemType: extractItemType(text),
        }

        result.set(pageNumber, metadata)
      } catch {
        /* One bad invoice page must not stop the other labels. */
        result.set(pageNumber, {
          text: '',
          sku: undefined,
          asin: undefined,
        })
      }
    }
  } finally {
    await loadingTask.destroy()
  }

  return result
}

/**
 * Backward-compatible single-page helper.
 */
export async function extractAmazonPageMetadata(
  pdfBytes: Uint8Array | Buffer,
  pageNumber: number,
): Promise<AmazonMetadata> {
  const map = await extractAmazonMetadataForPages(
    pdfBytes,
    [pageNumber],
  )

  return (
    map.get(pageNumber) ?? {
      text: '',
    }
  )
}
