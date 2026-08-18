/**
 * Vercel Blob configuration.
 *
 * Vercel's connected Blob store exposes the read/write token as
 * BLOB_READ_WRITE_TOKEN in this project.
 */
export function getBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    throw new Error(
      'Vercel Blob is not configured. Add BLOB_READ_WRITE_TOKEN to the backend environment variables.',
    )
  }
  return token
}

export function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}
