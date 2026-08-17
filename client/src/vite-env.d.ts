/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_BLOB_UPLOAD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
