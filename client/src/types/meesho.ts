export type MeeshoProcessOptions = {
  pickupSorting: boolean
  skuSorting: boolean
  orderNumber: boolean
  originalFile: boolean
  a4Printer: boolean
  printText: boolean
  customText?: string
}

export type MeeshoProcessResult = {
  pages: number
  filename: string
  downloadUrl: string
  labels: number
  sortedBySku?: boolean
  sortedByPickup?: boolean
  printedOrderNumber?: boolean
  printedText?: boolean
  customText?: string
}
