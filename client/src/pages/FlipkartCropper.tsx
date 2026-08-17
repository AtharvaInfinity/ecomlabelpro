function buildLabelFooterText(customText: string, orderIndex: number) {
  const baseText = customText.trim() || 'Print Text on Label'
  return `${baseText} | Order ${orderIndex}`
}

import { useRef, useState } from 'react'
import { Download, FileText, LoaderCircle, UploadCloud } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { uploadPdfs } from '../services/api'
import { processFlipkartPdfs, type FlipkartProcessResult } from '../services/flipkartApi'
import type { UploadedPdf } from '../types/pdf'

export default function FlipkartCropper() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [files, setFiles] = useState<UploadedPdf[]>([])
  const [orderNumber, setOrderNumber] = useState(false)
  const [skuSorting, setSkuSorting] = useState(true)
  const [a4Printer, setA4Printer] = useState(false)
  const [printText, setPrintText] = useState(false)
  const [customText, setCustomText] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<FlipkartProcessResult | null>(null)

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []).filter(
      (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'),
    )
    if (!selected.length) return
    setError('')
    setResult(null)
    try {
      setProcessing(true)
      const uploaded = await uploadPdfs(selected)
      setFiles(uploaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setProcessing(false)
    }
  }

  async function prepareLabels() {
    if (!files.length) {
      setError('Please choose at least one Flipkart PDF file.')
      return
    }
    if (printText && !customText.trim()) {
      setError('Please enter the text you want to print on the label.')
      return
    }

    setProcessing(true)
    setError('')
    setResult(null)
    try {
      const processed = await processFlipkartPdfs(files, {
        orderNumber,
        skuSorting,
        a4Printer,
        printText,
        customText: customText.trim(),
      })
      setResult(processed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed.')
    } finally {
      setProcessing(false)
    }
  }

  function reset() {
    setFiles([])
    setResult(null)
    setError('')
    setCustomText('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="site-page">
      <Navbar />
      <main className="flipkart-page">
        <section className="flipkart-shell">
          <div className="flipkart-heading">
            <div className="flipkart-logo" aria-hidden="true">🟨<span>F</span></div>
            <h1>Flipkart Shipping Label Crop</h1>
          </div>

          <ul className="flipkart-intro">
            <li>
              Simply upload a single or multiple label files and click <strong>‘Prepare Shipping Labels’</strong>.
              The tool will crop the Flipkart shipping-label area from each page and remove the invoice section.
            </li>
          </ul>

          <div className="flipkart-dashboard-banner">
            <div className="flipkart-dashboard-copy">
              <div><span className="dashboard-badge">New Dashboard</span><strong>Save Flipkart PDFs to dashboard</strong></div>
              <p>Manage PDFs, AI summaries, images, and reports from your account.</p>
              <span className="dashboard-pill">▣ E-commerce Label Solution</span>
            </div>
            <button type="button" className="dashboard-button">Create Account</button>
          </div>

          <section className="flipkart-options">
            <h2>Label Options</h2>
            <div className="flipkart-option-grid">
              <label className="flipkart-option">
                <input type="checkbox" checked={orderNumber} onChange={e => setOrderNumber(e.target.checked)} />
                <span>Order Number</span>
              </label>
              <label className="flipkart-option">
                <input type="checkbox" checked={skuSorting} onChange={e => setSkuSorting(e.target.checked)} />
                <span>SKU Sorting</span>
              </label>
              <label className="flipkart-option">
                <input type="checkbox" checked={a4Printer} onChange={e => setA4Printer(e.target.checked)} />
                <span>A4 Printer <small>(4 labels per page)</small></span>
              </label>
              <label className="flipkart-option">
                <input type="checkbox" checked={printText} onChange={e => setPrintText(e.target.checked)} />
                <span>Print text on label</span>
              </label>
            </div>

            {printText && (
              <div className="flipkart-print-text-box">
                <label htmlFor="flipkart-custom-text">Extra text to print on every label</label>
                <input
                  id="flipkart-custom-text"
                  type="text"
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  placeholder="Example: HANDLE WITH CARE"
                  maxLength={120}
                />
                <small>This text is printed in a small footer at the bottom of the cleaned Flipkart label.</small>
              </div>
            )}
          </section>

          <section className="flipkart-upload-section">
            <label className="flipkart-upload-title" htmlFor="flipkart-files">
              Choose Label Files (Multiple PDFs Allowed-Flipkart Only) <span>*</span>
            </label>
            <div
              className="flipkart-file-box"
              onClick={() => inputRef.current?.click()}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
              role="button"
              tabIndex={0}
            >
              <input ref={inputRef} id="flipkart-files" type="file" accept="application/pdf,.pdf" multiple onChange={handleFiles} className="flipkart-hidden-input" />
              <span className="flipkart-native-button">Choose files</span>
              <span className="flipkart-file-name">{files.length ? `${files.length} PDF${files.length > 1 ? 's' : ''} selected` : 'No file chosen'}</span>
              <UploadCloud size={19} className="flipkart-upload-icon" />
            </div>
            {files.length > 0 && (
              <div className="flipkart-file-list">
                {files.map(file => <div className="flipkart-file-item" key={file.fileId}><FileText size={15} /><span>{file.fileName} ({file.pages} pages)</span></div>)}
              </div>
            )}
          </section>

          <button type="button" className="flipkart-prepare-button" disabled={processing} onClick={() => void prepareLabels()}>
            {processing && <LoaderCircle size={20} className="spin" />}
            {processing ? 'Preparing...' : 'Prepare Shipping Labels'}
          </button>

          {error && <div className="flipkart-error">{error}</div>}

          {result && (
            <div className="flipkart-result">
              <div>
                <strong>{result.labels} labels prepared</strong>
                <span>{result.pages} output page{result.pages !== 1 ? 's' : ''}</span>
              </div>
              <a className="flipkart-download-button" href={result.downloadUrl} download={result.filename}>
                <Download size={18} /> Download PDF
              </a>
              <button type="button" className="flipkart-reset-button" onClick={reset}>Process Another PDF</button>
            </div>
          )}

          <div className="flipkart-bottom-actions">
            <button type="button" className="flipkart-bottom-button meesho-button"><span className="marketplace-icon">m</span>Meesho Labels</button>
            <button type="button" className="flipkart-bottom-button merge-button"><span className="merge-icon">↗</span>Merge PDFs</button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
