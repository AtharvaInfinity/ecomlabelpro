let pdfjsPromise: Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')> | undefined

/**
 * PDF.js 5.x expects a few browser graphics globals at module-evaluation time.
 * Vercel's Node runtime does not provide them. @napi-rs/canvas supplies
 * Node-compatible implementations, so install the globals before importing
 * PDF.js dynamically.
 */
export async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const canvas = await import('@napi-rs/canvas')
      const globals = globalThis as typeof globalThis & {
        DOMMatrix?: typeof canvas.DOMMatrix
        ImageData?: typeof canvas.ImageData
        Path2D?: typeof canvas.Path2D
      }

      if (!globals.DOMMatrix) globals.DOMMatrix = canvas.DOMMatrix
      if (!globals.ImageData) globals.ImageData = canvas.ImageData
      if (!globals.Path2D) globals.Path2D = canvas.Path2D

      return import('pdfjs-dist/legacy/build/pdf.mjs')
    })()
  }

  return pdfjsPromise
}
