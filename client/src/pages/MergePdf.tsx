import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  FilePlus2,
  FileText,
  Loader2,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { apiUrl, uploadPdfs } from '../services/api'

type SelectedFile = {
  fileId: string
  fileName: string
  pages: number
  size: number
}

type MergeResult = {
  fileId: string
  fileName: string
  pages: number
  files: number
}


export default function MergePdf() {
  const [files, setFiles] = useState<SelectedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [result, setResult] = useState<MergeResult | null>(null)
  const [error, setError] = useState('')

  const totalPages = useMemo(
    () => files.reduce((sum, file) => sum + file.pages, 0),
    [files],
  )

  async function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (!selected.length) return

    const invalid = selected.find(file => file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'))
    if (invalid) {
      setError('PDF files only.')
      return
    }

    if (files.length + selected.length > 20) {
      setError('You can select up to 20 PDF files.')
      return
    }

    setError('')
    setResult(null)
    setIsUploading(true)

    try {
      const uploadedPdfs = await uploadPdfs(selected)

      const uploaded: SelectedFile[] = uploadedPdfs.map((file, index) => ({
        ...file,
        size: selected[index]?.size ?? 0,
      }))

      setFiles(current => [...current, ...uploaded])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  function removeFile(index: number) {
    setFiles(current => current.filter((_, i) => i !== index))
    setResult(null)
  }

  function moveFile(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= files.length) return

    setFiles(current => {
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setResult(null)
  }

  async function mergeFiles() {
    if (files.length < 2) {
      setError('Select at least 2 PDF files to merge.')
      return
    }

    setError('')
    setResult(null)
    setIsMerging(true)

    try {
      const response = await fetch(apiUrl('/api/pdf/merge'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: files.map(file => ({
            fileId: file.fileId,
            fileName: file.fileName,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'PDF merge failed.')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF merge failed.')
    } finally {
      setIsMerging(false)
    }
  }

  function clearAll() {
    setFiles([])
    setResult(null)
    setError('')
  }

  return (
    <div className="site-page">
      <Navbar />

      <main className="merge-page">
        <div className="merge-shell">
          <Link to="/" className="back-link">
            <ArrowLeft size={16} /> Back to home
          </Link>

          <div className="merge-heading">
            <div className="merge-icon">
              <FilePlus2 size={26} />
            </div>
            <div>
              <span className="tool-badge">PDF TOOL</span>
              <h1>Merge PDF</h1>
            </div>
          </div>

          <p className="merge-intro">
            Combine multiple PDF files into one document. Upload your PDFs, arrange
            them in the order you want, and click <strong>Merge PDFs</strong>.
          </p>

          <div className="merge-upload-card">
            <div className="merge-upload-icon">
              <FilePlus2 size={28} />
            </div>
            <h2>Add PDF files</h2>
            <p>Choose 2 to 20 PDF files. You can change their order before merging.</p>

            <label className="merge-choose-btn">
              <FileText size={18} />
              {isUploading ? 'Uploading...' : 'Choose PDF files'}
              <input
                type="file"
                accept="application/pdf,.pdf"
                multiple
                onChange={addFiles}
                disabled={isUploading}
                hidden
              />
            </label>

            <span className="merge-limit">Maximum 20 files · PDF only</span>
          </div>

          {files.length > 0 && (
            <section className="merge-list-card">
              <div className="merge-list-header">
                <div>
                  <h2>Selected PDFs</h2>
                  <p>
                    {files.length} {files.length === 1 ? 'file' : 'files'} · {totalPages}{' '}
                    {totalPages === 1 ? 'page' : 'pages'}
                  </p>
                </div>
                <button type="button" className="merge-clear-btn" onClick={clearAll}>
                  Clear all
                </button>
              </div>

              <div className="merge-file-list">
                {files.map((file, index) => (
                  <div className="merge-file-row" key={`${file.fileId}-${index}`}>
                    <div className="merge-file-number">{index + 1}</div>

                    <div className="merge-file-info">
                      <div className="merge-file-name">{file.fileName}</div>
                      <div className="merge-file-meta">
                        {file.pages ? `${file.pages} ${file.pages === 1 ? 'page' : 'pages'}` : 'PDF selected'}
                        {file.size > 0
                          ? ` · ${(file.size / 1024 / 1024).toFixed(2)} MB`
                          : ''}
                      </div>
                    </div>

                    <div className="merge-file-actions">
                      <button
                        type="button"
                        onClick={() => moveFile(index, -1)}
                        disabled={index === 0}
                        title="Move up"
                        aria-label={`Move ${file.fileName} up`}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveFile(index, 1)}
                        disabled={index === files.length - 1}
                        title="Move down"
                        aria-label={`Move ${file.fileName} down`}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => removeFile(index)}
                        title="Remove"
                        aria-label={`Remove ${file.fileName}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="merge-button"
                onClick={mergeFiles}
                disabled={files.length < 2 || isMerging}
              >
                {isMerging ? (
                  <>
                    <Loader2 size={19} className="spin" /> Merging PDFs...
                  </>
                ) : (
                  <>
                    <FilePlus2 size={19} /> Merge PDFs
                  </>
                )}
              </button>
            </section>
          )}

          {error && <div className="merge-error">{error}</div>}

          {result && (
            <section className="merge-result">
              <div className="merge-result-icon">
                <CheckCircle2 size={22} />
              </div>
              <div className="merge-result-copy">
                <strong>PDFs merged successfully</strong>
                <span>
                  {result.files} files · {result.pages} pages · {result.fileName}
                </span>
              </div>
              <a
                className="merge-download-btn"
                href={apiUrl(`/api/pdf/download/${result.fileId}?name=${encodeURIComponent(result.fileName)}`)}
                download={result.fileName}
              >
                Download merged PDF
              </a>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
