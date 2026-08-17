import type { ProcessOptions, ProcessResult, UploadedPdf } from '../types/pdf'

async function json(response: Response) {
  const text = await response.text()

  if (!text.trim()) {
    throw new Error(
      `Server returned an empty response (HTTP ${response.status}).`,
    )
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(
      `Server returned invalid JSON (HTTP ${response.status}).`,
    )
  }
}

export async function uploadPdfs(
  files: File[],
): Promise<UploadedPdf[]> {
  const form = new FormData()

  files.forEach((file) => {
    form.append('files', file)
  })

  const response = await fetch('/api/pdf/upload', {
    method: 'POST',
    body: form,
  })

  const data = await json(response)

  if (!response.ok) {
    throw new Error(data.message || 'Upload failed.')
  }

  return data.files
}

export async function processPdfs(
  files: UploadedPdf[],
  options: ProcessOptions,
): Promise<ProcessResult> {
  const payload = {
    files,
    options: {
      mode: options.mode,
      a4Printer: Boolean(options.a4Printer),
      skuSorting: Boolean(options.skuSorting),
      printSku: Boolean(options.printSku),
      printAsin: Boolean(options.printAsin),
      bottomExtraSpace: Number(options.bottomExtraSpace ?? 30),
      rightExtraSpace: Number(options.rightExtraSpace ?? 36),
    },
  }

  console.log('Ecom Label Pro - Amazon options:', payload.options)

  const response = await fetch('/api/pdf/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await json(response)

  if (!response.ok) {
    throw new Error(data.message || 'Processing failed.')
  }

  return data
}
