# Meesho Crop Update

The Meesho crop is based on the supplied 768x1024 invoice PDF.

Shipping label area measured from the supplied PDF:
- Left: 15 px
- Right: 752 px
- Top: 15 px
- Bottom of label from top: 429 px

The processor stores these as normalized ratios so the crop scales to the actual PDF page size.

The crop excludes the `Fold Here` separator and the tax invoice below it.

Test file:
`test-data/meesho_demo_invoice_10_pages.pdf`
