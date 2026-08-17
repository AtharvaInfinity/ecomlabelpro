function buildLabelFooterText(customText: string, orderIndex: number) {
  const baseText = customText.trim() || 'Print Text on Label'
  return `${baseText} | Order ${orderIndex}`
}

import type { UploadedPdf } from '../types/pdf'

export type FlipkartProcessOptions = {
  orderNumber: boolean
  skuSorting: boolean
  a4Printer: boolean
  printText: boolean
  customText: string
}

export type FlipkartProcessResult = {
  pages: number
  filename: string
  downloadUrl: string
  labels: number
  sortedBySku: boolean
  printedOrderNumber: boolean
  printedText: boolean
  customText: string
}

async function parseJson(response: Response) {
  const text = await response.text()
  if (!text.trim()) throw new Error(`Server returned an empty response (HTTP ${response.status}).`)
  try { return JSON.parse(text) } catch { throw new Error(`Server returned invalid JSON (HTTP ${response.status}).`) }
}

export async function processFlipkartPdfs(
  files: UploadedPdf[],
  options: FlipkartProcessOptions,
): Promise<FlipkartProcessResult> {
  const response = await fetch('/api/flipkart/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, options }),
  })

  const data = await parseJson(response)
  if (!response.ok) throw new Error(data.message || 'Flipkart processing failed.')
  return data
}
