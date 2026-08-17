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
      // PDF.js' DOM types and @napi-rs/canvas' DOM types are structurally
      // different across current TypeScript/lib.dom versions. The runtime
      // only needs these constructors on globalThis, so keep this boundary
      // intentionally untyped.
      const globals = globalThis as any

      if (!globals.DOMMatrix) globals.DOMMatrix = canvas.DOMMatrix
      if (!globals.ImageData) globals.ImageData = canvas.ImageData
      if (!globals.Path2D) globals.Path2D = canvas.Path2D

      return import('pdfjs-dist/legacy/build/pdf.mjs')
    })()
  }

  return pdfjsPromise
}
