# FolioVault — Interactive Physical Document Scanner & Archival Vault

A working client-side physical document scanner, canvas image enhancer, and IndexedDB-backed archival cabinet built with zero external dependencies.

## Key Features
- **Real IndexedDB Document Persistence (`js/db.js`):** Stores uploaded scans (`PNG`, `JPG`, `WebP`, and `PDF`) plus extracted OCR metadata locally in the browser across refreshes.
- **Interactive Scan & Enhancement Studio (`js/scanner.js`):** Real-time HTML5 `<canvas>` pixel filters (*Original*, *Magic Scan*, *Crisp B&W Ink*, *Warm Archive*), Brightness/Contrast sliders, Fine Deskew (`-15°` to `+15°`), `90°` rotate, and optional `getUserMedia` camera capture.
- **Crooked Sample Phone Photo Mode (`js/samples.js`):** Built-in skewed warm-lit receipt photo lets visitors immediately test deskewing and Magic Scan whitening without needing to upload a file first.
- **Full-Text Search, Folders & Lightbox Inspector (`js/app.js`):** Filter across folders and Starred items, search OCR text/tags, toggle Grid/List views, zoom/rotate scans, edit metadata, and download enhanced files.
