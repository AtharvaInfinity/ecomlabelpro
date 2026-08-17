import { getPdfjs } from './pdfjs-node.service.js'

export type MeeshoPageMetadata = {
  sku?: string
  pickup?: string
}

function clean(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function findSku(text: string) {
  const match = text.match(/\bSKU\b\s*[:\-]?\s*([A-Za-z0-9._-]+)/i)
  return match?.[1] ? clean(match[1]) : undefined
}

function findPickup(text: string) {
  const match = text.match(/\b(Pickup|Pick\s*up)\b\s*[:\-]?\s*([A-Za-z0-9 ._-]+)/i)
  return match?.[2] ? clean(match[2]) : undefined
}

export async function extractMeeshoMetadata(
  bytes: Uint8Array,
): Promise<MeeshoPageMetadata[]> {
  const pdfjsLib = await getPdfjs()
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
  const result: MeeshoPageMetadata[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')

    result.push({
      sku: findSku(text),
      pickup: findPickup(text),
    })
  }

  return result
}
