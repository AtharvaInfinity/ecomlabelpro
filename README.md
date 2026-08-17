MEESHO MODULE FIX

The previous module had two integration problems:
1. MeeshoCropper imported processMeeshoPdfs from services/api even though it is in services/meesho-api.ts.
2. The Meesho page must be registered in the existing React Router and the backend route must be registered in Fastify.

Copy/merge these files without replacing your Amazon/Flipkart modules.
Then follow client/ROUTE-FIX.txt and server/ROUTE-FIX.txt.


## Meesho Module

The Meesho page is available at `/tools/meesho` and is registered in the main React router.
The Meesho processing API is registered at `/api/meesho/process` in `server/src/server.ts`.

Run the API from `server` and the Vite app from `client` so the existing Vite `/api` proxy can reach port 4000.


## Merge PDF
The Merge PDF module is available at `/tools/merge-pdf`. It accepts 2–20 PDFs, supports ordering/removal, and merges them server-side with pdf-lib.


## Vercel Deployment

This repository is prepared as two Vercel projects using the same GitHub repository.

### 1. Backend project
- Import this GitHub repository into Vercel.
- Set Root Directory to `server`.
- Vercel detects the Fastify entrypoint (`src/server.ts`) automatically.
- Connect a Vercel Blob store to this project.
- Add `BLOB_READ_WRITE_TOKEN` to the backend project's Environment Variables.
- Deploy and copy the backend URL.

### 2. Frontend project
- Import the same GitHub repository into a second Vercel project.
- Set Root Directory to `client`.
- Framework: Vite.
- Build Command: `npm run build`
- Output Directory: `dist`
- Add:
  - `VITE_API_BASE_URL=https://YOUR-BACKEND-VERCEL-URL`
  - `VITE_BLOB_UPLOAD=true`
- Deploy.

The frontend uploads PDFs directly to Vercel Blob in production so large PDFs do not pass through the Vercel Function request body. Vercel documents a 4.5 MB Function request-body limit and recommends direct-to-Blob client uploads for larger files.

Amazon, Flipkart, Meesho and Merge PDF processing requests send only PDF metadata/file IDs to the backend, which downloads the selected private Blob objects, processes them, and stores generated PDFs in Blob storage.
