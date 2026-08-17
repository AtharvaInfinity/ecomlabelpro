import { Link, NavLink } from 'react-router-dom'
import { ChevronDown, Menu, X } from 'lucide-react'
import { useState } from 'react'

type DropdownKey = 'product-images' | 'pdf-tools' | null

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [dropdown, setDropdown] = useState<DropdownKey>(null)

  const closeMenus = () => {
    setOpen(false)
    setDropdown(null)
  }

  const toggleDropdown = (key: Exclude<DropdownKey, null>) => {
    setDropdown((current) => (current === key ? null : key))
  }

  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link to="/" className="brand elabel-brand" onClick={closeMenus} aria-label="Ecom Label PRO home">
          <span>Ecom Label PRO</span>
        </Link>

        <nav className="desktop-nav" aria-label="Main navigation">
          <NavLink to="/tools/meesho" className="top-nav-link">Meesho</NavLink>
          <NavLink to="/tools/flipkart" className="top-nav-link">Flipkart</NavLink>
          <NavLink to="/tools/amazon" className="top-nav-link">Amazon</NavLink>
          <NavLink to="/tools/merge-pdf" className="top-nav-link">Merge PDF</NavLink>

          <NavLink to="/tools/ai-listing" className="top-nav-link new-link">
            <span>AI Listing</span>
            <span className="new-badge">NEW</span>
          </NavLink>

          <div className="nav-dropdown">
            <button
              type="button"
              className="top-nav-link nav-dropdown-trigger"
              onClick={() => toggleDropdown('product-images')}
              aria-expanded={dropdown === 'product-images'}
            >
              <span>Product Images</span>
              <ChevronDown size={15} className={dropdown === 'product-images' ? 'chevron-open' : ''} />
              <span className="new-badge">NEW</span>
            </button>
            {dropdown === 'product-images' && (
              <div className="nav-dropdown-menu">
                <NavLink to="/tools/product-images" onClick={closeMenus}>Image Tools</NavLink>
                <NavLink to="/tools/product-images/background" onClick={closeMenus}>Background Removal</NavLink>
                <NavLink to="/tools/product-images/resize" onClick={closeMenus}>Resize Images</NavLink>
              </div>
            )}
          </div>

          <div className="nav-dropdown">
            <button
              type="button"
              className="top-nav-link nav-dropdown-trigger"
              onClick={() => toggleDropdown('pdf-tools')}
              aria-expanded={dropdown === 'pdf-tools'}
            >
              <span>PDF Tools</span>
              <ChevronDown size={15} className={dropdown === 'pdf-tools' ? 'chevron-open' : ''} />
            </button>
            {dropdown === 'pdf-tools' && (
              <div className="nav-dropdown-menu pdf-menu">
                <NavLink to="/tools/merge-pdf" onClick={closeMenus}>Merge PDF</NavLink>
                <NavLink to="/tools/split-pdf" onClick={closeMenus}>Split PDF</NavLink>
                <NavLink to="/tools/compress-pdf" onClick={closeMenus}>Compress PDF</NavLink>
                <NavLink to="/tools/pdf-to-image" onClick={closeMenus}>PDF to Image</NavLink>
              </div>
            )}
          </div>
        </nav>

        <div className="nav-actions">
          <button type="button" className="login-button" onClick={() => undefined}>Log In</button>
          <button className="menu-button" onClick={() => setOpen((value) => !value)} aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mobile-menu">
          <NavLink to="/tools/meesho" onClick={closeMenus}>Meesho</NavLink>
          <NavLink to="/tools/flipkart" onClick={closeMenus}>Flipkart</NavLink>
          <NavLink to="/tools/amazon" onClick={closeMenus}>Amazon</NavLink>
          <NavLink to="/tools/merge-pdf" onClick={closeMenus}>Merge PDF</NavLink>
          <NavLink to="/tools/ai-listing" onClick={closeMenus}>AI Listing <span className="mobile-new">NEW</span></NavLink>
          <NavLink to="/tools/product-images" onClick={closeMenus}>Product Images <span className="mobile-new">NEW</span></NavLink>
          <NavLink to="/tools/pdf-tools" onClick={closeMenus}>PDF Tools</NavLink>
          <button type="button" className="mobile-login" onClick={closeMenus}>Log In</button>
        </div>
      )}
    </header>
  )
}
