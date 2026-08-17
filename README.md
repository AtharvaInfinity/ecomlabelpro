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
