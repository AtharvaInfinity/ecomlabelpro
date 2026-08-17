import { useState } from 'react'
import { ArrowLeft, CheckCircle2, Download, LoaderCircle, Settings2, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { processPdfs, uploadPdfs } from '../services/api'
import type { ProcessOptions, ProcessResult, UploadedPdf } from '../types/pdf'

export default function AmazonCropper() {
  const [files, setFiles] = useState<UploadedPdf[]>([])
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<ProcessOptions['mode']>('remove-invoice')
  const [a4Printer, setA4Printer] = useState(false)
  const [skuSorting, setSkuSorting] = useState(true)
  const [printSku, setPrintSku] = useState(false)
  const [printAsin, setPrintAsin] = useState(false)

  async function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    if (!selected.length) return
    setError('')
    setResult(null)
    const bad = selected.find(f => !f.name.toLowerCase().endsWith('.pdf'))
    if (bad) {
      setError('Amazon PDF files only.')
      return
    }
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

  async function prepare() {
    if (!files.length) return
    setError('')
    setResult(null)
    try {
      setProcessing(true)
      const processed = await processPdfs(files, {
        mode,
        a4Printer,
        skuSorting,
        printSku,
        printAsin,
        bottomExtraSpace: mode === 'remove-invoice-extra' ? 30 : 18,
        rightExtraSpace: 36,
      })
      setResult(processed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed.')
    } finally {
      setProcessing(false)
    }
  }

  function clear() {
    setFiles([])
    setResult(null)
    setError('')
  }

  return (
    <div className="site-page">
      <Navbar />
      <main className="tool-page">
        <div className="tool-shell">
          <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to Ecom Label Pro</Link>
          <div className="tool-heading">
            <div className="amazon-title-mark">a</div>
            <div>
              <div className="tool-badge">Amazon Tool</div>
              <h1>Amazon Shipping Label Crop</h1>
            </div>
          </div>
          <ul className="intro"><li>Upload your single or multiple label files and click <b>“Prepare Shipping Labels”</b>. This tool automatically removes invoices and prepares a clean shipping PDF.</li></ul>

          <div className="dashboard-banner">
            <div className="dashboard-copy"><span className="dashboard-badge">New Dashboard</span><div className="dashboard-title">Save Amazon PDFs to dashboard</div><div className="dashboard-sub">Manage PDFs, AI summaries, images, and reports from your account.</div><span className="dashboard-pill">▣ Shipping &amp; Logistics</span></div>
            <span className="dashboard-button">Create Account</span>
          </div>

          <section className="label-options">
            <h2>Label Options</h2>
            <div className="amazon-options">
              <label className="amazon-option"><input type="radio" name="mode" checked={mode === 'remove-invoice'} onChange={() => setMode('remove-invoice')} /><span>Remove Invoice</span></label>
              <label className="amazon-option"><input type="radio" name="mode" checked={mode === 'remove-invoice-extra'} onChange={() => setMode('remove-invoice-extra')} /><span>Remove Invoice With Extra Space <small>(uses existing label whitespace)</small></span></label>
              <label className="amazon-option"><input type="checkbox" checked={a4Printer} onChange={e => setA4Printer(e.target.checked)} /><span>A4 Printer <small>(4 labels per page)</small></span></label>
              <label className="amazon-option"><input type="checkbox" checked={skuSorting} onChange={e => setSkuSorting(e.target.checked)} /><span>SKU Sorting</span></label>
              <label className="amazon-option"><input type="checkbox" checked={printSku} onChange={e => setPrintSku(e.target.checked)} /><span>Print SKU at bottom</span></label>
              <label className="amazon-option"><input type="checkbox" checked={printAsin} onChange={e => setPrintAsin(e.target.checked)} /><span>Print ASIN at bottom</span></label>
            </div>
          </section>

          <section className="upload-section">
            <div className="upload-title">Choose Label Files (Multiple PDFs Allowed-Amazon Only) <span>*</span></div>
            <div className="file-box"><input className="file-input" type="file" accept=".pdf,application/pdf" multiple onChange={choose} /></div>
            {files.length > 0 && <div className="files-list">{files.map((file, index) => <div className="file-item" key={file.fileId}><span>{index + 1}. {file.fileName} ({file.pages} pages)</span></div>)}</div>}
            {files.length > 0 && <button type="button" onClick={clear} className="clear-button"><Trash2 size={14} /> Clear files</button>}
          </section>

          <button className="prepare-button" disabled={!files.length || processing} onClick={() => void prepare()}>
            {processing ? <><LoaderCircle size={19} className="spin" /> Preparing...</> : <><Settings2 size={19} /> Prepare Shipping Labels</>}
          </button>

          {result && <div className="result-box"><b><CheckCircle2 size={17} /> Shipping labels prepared successfully.</b><div className="result-note">{result.pages} output pages from {result.files} PDF file(s). Invoice pages removed. {a4Printer ? 'A4 layout enabled. ' : ''}{(printSku || printAsin) && <>Metadata detected on {result.metadataDetected ?? 0} label(s). {(result.metadataMissing ?? 0) > 0 ? `${result.metadataMissing} label(s) had no detectable SKU/ASIN.` : ''}</>}</div><a className="download-button" href={result.downloadUrl} download={result.filename}><Download size={16} /> Download Shipping Labels</a></div>}
          {error && <div className="error-box">{error}</div>}
        </div>
      </main>
      <Footer />
    </div>
  )
}
