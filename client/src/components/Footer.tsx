import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <div className="footer-brand">Ecom Label Pro</div>
          <p>Simple PDF tools for ecommerce shipping labels.</p>
        </div>
        <div className="footer-links">
          <Link to="/">Home</Link>
          <Link to="/tools/amazon">Amazon Labels</Link>
          <a href="#features">Features</a>
        </div>
      </div>
      <div className="footer-bottom">© 2026 Ecom Label Pro. No account required for the demo.</div>
    </footer>
  )
}
