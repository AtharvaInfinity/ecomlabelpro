import { ArrowRight, Check, FileText, Layers3, ShieldCheck, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Home() {
  return (
    <div className="site-page">
      <Navbar />
      <main>
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-copy">
              <div className="eyebrow"><span>NEW</span> Ecommerce PDF tools</div>
              <h1>Prepare shipping labels <span>faster.</span></h1>
              <p>Upload your ecommerce PDFs, remove unwanted invoice pages, keep labels print-safe, and prepare files for your shipping workflow.</p>
              <div className="hero-actions">
                <Link to="/tools/amazon" className="primary-btn">Open Amazon Label Tool <ArrowRight size={18} /></Link>
                <a href="#features" className="secondary-btn">Explore features</a>
              </div>
              <div className="trust-row">
                <span><Check size={15} /> No login</span>
                <span><Check size={15} /> Multiple PDFs</span>
                <span><Check size={15} /> Print-safe output</span>
              </div>
            </div>
            <div className="hero-card">
              <div className="hero-card-top"><span className="status-dot" /> PDF processing</div>
              <div className="mock-pdf">
                <div className="mock-line wide" /><div className="mock-line" /><div className="mock-label"><span>AMAZON</span><strong>SHIPPING LABEL</strong></div><div className="mock-barcode" /><div className="mock-line short" />
              </div>
              <div className="mock-result"><Check size={16} /> Invoice removed · Label ready</div>
            </div>
          </div>
        </section>

        <section id="features" className="features section-container">
          <div className="section-heading"><div className="eyebrow">Built for sellers</div><h2>Everything you need for label preparation</h2><p>Start with Amazon and expand your workflow as your shipping volume grows.</p></div>
          <div className="feature-grid">
            <div className="feature-card"><div className="icon-box"><FileText size={22} /></div><h3>PDF label processing</h3><p>Upload one or multiple PDF files and prepare them in one workflow.</p></div>
            <div className="feature-card"><div className="icon-box"><Layers3 size={22} /></div><h3>Invoice removal</h3><p>Separate shipping labels from common Amazon label/invoice PDF layouts.</p></div>
            <div className="feature-card"><div className="icon-box"><ShieldCheck size={22} /></div><h3>Print-safe output</h3><p>Keep extra printable space so important label content is less likely to be clipped.</p></div>
          </div>
        </section>

        <section id="how-it-works" className="steps section-container">
          <div className="section-heading"><div className="eyebrow">How it works</div><h2>Three simple steps</h2></div>
          <div className="step-grid">
            <div className="step"><b>01</b><h3>Choose a tool</h3><p>Open the Amazon label tool from the dashboard.</p></div>
            <div className="step"><b>02</b><h3>Upload PDFs</h3><p>Select one or multiple Amazon PDF files.</p></div>
            <div className="step"><b>03</b><h3>Prepare & download</h3><p>Choose your options and download the processed labels.</p></div>
          </div>
        </section>

        <section className="cta-section"><div><div className="eyebrow light">Ready to start?</div><h2>Prepare your Amazon labels now.</h2><p>No account or login is required.</p></div><Link to="/tools/amazon" className="light-btn">Open Amazon Tool <ArrowRight size={18} /></Link></section>
      </main>
      <Footer />
    </div>
  )
}
