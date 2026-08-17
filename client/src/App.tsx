import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import AmazonCropper from './pages/AmazonCropper'
import FlipkartCropper from './pages/FlipkartCropper'
import MeeshoCropper from './pages/MeeshoCropper'
import MergePdf from './pages/MergePdf'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tools/amazon" element={<AmazonCropper />} />
      <Route path="/tools/flipkart" element={<FlipkartCropper />} />
      <Route path="/tools/meesho" element={<MeeshoCropper />} />
      <Route path="/tools/merge-pdf" element={<MergePdf />} />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
