import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

export type FlipkartMetadata = {
  orderNumber?: string
  sku?: string
}

function clean(value?: string) {
  return value?.replace(/\s+/g, ' ').trim() || undefined
}

function extractOrderNumber(text: string) {
  const match = text.match(/\b(OD\d{10,30})\b/i)
  return clean(match?.[1]?.toUpperCase())
}

function extractSku(text: string) {
  const explicit = text.match(/SKU\s*ID\s*\|?\s*[^\n|]*?\b([A-Z0-9][A-Z0-9._-]{2,100})\b/i)
  if (explicit?.[1] && !/^DESCRIPTION$/i.test(explicit[1])) return clean(explicit[1])

  const fallback = text.match(/\b([A-Z]{2,10}_[A-Z0-9][A-Z0-9._-]{2,100})\b/)
  return clean(fallback?.[1])
}

export async function extractFlipkartMetadataForPages(
  pdfBytes: Uint8Array,
  pageNumbers: number[],
): Promise<Map<number, FlipkartMetadata>> {
  const data = new Uint8Array(
    pdfBytes.buffer,
    pdfBytes.byteOffset,
    pdfBytes.byteLength,
  )

  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    verbosity: 0,
  })

  const result = new Map<number, FlipkartMetadata>()

  try {
    const document = await loadingTask.promise

    for (const pageNumber of pageNumbers) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      const text = content.items
        .map((item: any) => typeof item?.str === 'string' ? item.str : '')
        .filter(Boolean)
        .join(' ')

      result.set(pageNumber, {
        orderNumber: extractOrderNumber(text),
        sku: extractSku(text),
      })
    }

    return result
  } finally {
    await loadingTask.destroy()
  }
}
