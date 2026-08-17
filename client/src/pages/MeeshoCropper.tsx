import { useState } from 'react'
import { CheckCircle2, Download, LoaderCircle, Trash2 } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { uploadPdfs } from '../services/api'
import { processMeeshoPdfs } from '../services/meesho-api'
import type { MeeshoProcessOptions, MeeshoProcessResult } from '../types/meesho'
import { apiUrl } from '../services/api'

type UploadedPdf = {
  fileId: string
  fileName: string
  pages: number
}

export default function MeeshoCropper() {
  const [files, setFiles] = useState<UploadedPdf[]>([])
  const [result, setResult] = useState<MeeshoProcessResult | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [pickupSorting, setPickupSorting] = useState(false)
  const [skuSorting, setSkuSorting] = useState(true)
  const [orderNumber, setOrderNumber] = useState(false)
  const [originalFile, setOriginalFile] = useState(false)
  const [a4Printer, setA4Printer] = useState(false)
  const [printText, setPrintText] = useState(false)
  const [customText, setCustomText] = useState('')

  async function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    if (!selected.length) return

    const bad = selected.find(
      file => !file.name.toLowerCase().endsWith('.pdf'),
    )
    if (bad) {
      setError('Meesho PDF files only.')
      return
    }

    try {
      setError('')
      setResult(null)
      setProcessing(true)
      setFiles(await uploadPdfs(selected))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setProcessing(false)
    }
  }

  async function prepare() {
    if (!files.length) return

    const options: MeeshoProcessOptions = {
      pickupSorting,
      skuSorting,
      orderNumber,
      originalFile,
      a4Printer,
      printText,
      customText,
    }

    try {
      setError('')
      setResult(null)
      setProcessing(true)
      setResult(await processMeeshoPdfs(files, options))
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
          <div className="tool-heading">
            <div className="meesho-title-mark">🟣</div>
            <div>
              <div className="tool-badge">Meesho Tool</div>
              <h1>Meesho Shipping Label Crop</h1>
            </div>
          </div>

          <ul className="intro">
            <li>
              Upload your single or multiple label files and click{' '}
              <b>“Prepare Shipping Labels”</b>. This tool automatically crops
              the Meesho shipping label and removes the invoice.
            </li>
          </ul>

          <div className="dashboard-banner">
            <div>
              <span className="dashboard-badge">New Dashboard</span>
              <div className="dashboard-title">
                Save Meesho PDFs to dashboard
              </div>
              <div className="dashboard-sub">
                Manage PDFs, AI summaries, images, and reports from your account.
              </div>
              <span className="dashboard-pill">▣ Meesho Seller Tools</span>
            </div>
            <span className="dashboard-button">Create Account</span>
          </div>

          <section
            className="label-options"
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              background: "#ffffff",
              padding: "20px",
              marginBottom: "16px",
            }}
          >
            <h2
              style={{
                margin: "0 0 16px 0",
                fontSize: "16px",
                lineHeight: "24px",
                fontWeight: 600,
                color: "#0f172a",
              }}
            >
              Label Options
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "12px",
                width: "100%",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  minHeight: "48px",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  cursor: "pointer",
                  margin: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={pickupSorting}
                  onChange={e => setPickupSorting(e.target.checked)}
                  style={{ width: "16px", height: "16px", flex: "0 0 auto", margin: 0 }}
                />
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#1e293b" }}>
                  Pickup Sorting
                </span>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  minHeight: "48px",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  cursor: "pointer",
                  margin: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={skuSorting}
                  onChange={e => setSkuSorting(e.target.checked)}
                  style={{ width: "16px", height: "16px", flex: "0 0 auto", margin: 0 }}
                />
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#1e293b" }}>
                  SKU Sorting
                </span>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  minHeight: "48px",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  cursor: "pointer",
                  margin: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={orderNumber}
                  onChange={e => setOrderNumber(e.target.checked)}
                  style={{ width: "16px", height: "16px", flex: "0 0 auto", margin: 0 }}
                />
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#1e293b" }}>
                  Order Number
                </span>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  minHeight: "48px",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  cursor: "pointer",
                  margin: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={originalFile}
                  onChange={e => setOriginalFile(e.target.checked)}
                  style={{ width: "16px", height: "16px", flex: "0 0 auto", margin: 0 }}
                />
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#1e293b" }}>
                  Original File (with invoice)
                </span>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  minHeight: "48px",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  cursor: "pointer",
                  margin: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={a4Printer}
                  onChange={e => setA4Printer(e.target.checked)}
                  style={{ width: "16px", height: "16px", flex: "0 0 auto", margin: 0 }}
                />
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#1e293b" }}>
                  A4 Printer
                  <span style={{ marginLeft: "5px", fontSize: "12px", fontWeight: 400, color: "#64748b" }}>
                    (4 labels per page)
                  </span>
                </span>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  minHeight: "48px",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  cursor: "pointer",
                  margin: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={printText}
                  onChange={e => setPrintText(e.target.checked)}
                  style={{ width: "16px", height: "16px", flex: "0 0 auto", margin: 0 }}
                />
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#1e293b" }}>
                  Print text on label
                </span>
              </label>
            </div>

            {printText && (
              <div
                style={{
                  marginTop: "16px",
                  width: "100%",
                  boxSizing: "border-box",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  background: "#ffffff",
                  padding: "16px",
                }}
              >
                <label
                  htmlFor="meesho-print-text"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    lineHeight: "20px",
                    fontWeight: 600,
                    color: "#1e293b",
                  }}
                >
                  Text to print on label
                </label>
                <input
                  id="meesho-print-text"
                  type="text"
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  placeholder="Enter extra message"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "44px",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    background: "#ffffff",
                    color: "#0f172a",
                    fontSize: "14px",
                    lineHeight: "20px",
                    outline: "none",
                  }}
                />
                <p
                  style={{
                    margin: "8px 0 0 0",
                    fontSize: "12px",
                    lineHeight: "18px",
                    color: "#64748b",
                  }}
                >
                  This message will be printed at the bottom of the shipping label.
                </p>
              </div>
            )}
          </section>

          <section className="upload-section">
            <div className="upload-title">
              Choose Label Files (Multiple PDFs Allowed-Meesho Only){' '}
              <span>*</span>
            </div>

            <div className="file-box">
              <input
                className="file-input"
                type="file"
                accept=".pdf,application/pdf"
                multiple
                onChange={choose}
              />
            </div>

            {files.length > 0 && (
              <div className="files-list">
                {files.map((file, index) => (
                  <div className="file-item" key={file.fileId}>
                    {index + 1}. {file.fileName}{file.pages ? ` (${file.pages} pages)` : ' (PDF selected)'}
                  </div>
                ))}
              </div>
            )}

            {files.length > 0 && (
              <button type="button" onClick={clear} className="clear-button">
                <Trash2 size={14} /> Clear files
              </button>
            )}
          </section>

          <button
            className="prepare-button"
            disabled={!files.length || processing}
            onClick={() => void prepare()}
          >
            {processing ? (
              <>
                <LoaderCircle size={19} className="spin" /> Preparing...
              </>
            ) : (
              'Prepare Shipping Labels'
            )}
          </button>

          {result && (
            <div className="result-box">
              <b>
                <CheckCircle2 size={17} /> Shipping labels prepared successfully.
              </b>

              <div className="result-note">
                {result.labels} label(s) processed into {result.pages} PDF page(s).
              </div>

              <a
                className="download-button"
                href={apiUrl(result.downloadUrl)}
                download={result.filename}
              >
                <Download size={16} /> Download Shipping Labels
              </a>
            </div>
          )}

          {error && <div className="error-box">{error}</div>}
        </div>
      </main>

      <Footer />
    </div>
  )
}
