export type UploadedPdf = {
  fileId: string
  fileName: string
  pages: number
}

export type ProcessOptions = {
  mode: 'remove-invoice' | 'remove-invoice-extra'
  a4Printer: boolean
  skuSorting: boolean
  printSku: boolean
  printAsin: boolean
  bottomExtraSpace?: number
  rightExtraSpace?: number
}

export type ProcessResult = {
  pages: number
  filename: string
  downloadUrl: string
  files: number
  labelPages: number[]
  invoicePages: number[]
  sortedBySku?: boolean
  printSku?: boolean
  printAsin?: boolean
  metadataDetected?: number
  metadataMissing?: number
}
