import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { get, put } from '@vercel/blob'

type UploadedFile = { fileId: string; fileName: string; pages?: number }

const localUploadDir = process.env.VERCEL
  ? '/tmp/ecom-label-pro/uploads'
  : path.resolve(process.cwd(), 'data/uploads')

const localOutputDir = process.env.VERCEL
  ? '/tmp/ecom-label-pro/outputs'
  : path.resolve(process.cwd(), 'data/outputs')

function hasBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

export function getLocalUploadPath(fileId: string) {
  return path.join(localUploadDir, path.basename(fileId))
}

export async function materializeUploads(files: UploadedFile[]) {
  await fs.mkdir(localUploadDir, { recursive: true })

  if (!hasBlobStorage()) return

  for (const file of files) {
    const target = getLocalUploadPath(file.fileId)

    try {
      await fs.access(target)
      continue
    } catch {
      // Download from Blob below.
    }

    const result = await get(file.fileId, {
      access: 'private',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    if (!result) {
      throw new Error(`Uploaded PDF not found in storage: ${file.fileId}`)
    }

    const buffer = Buffer.from(await new Response(result.stream).arrayBuffer())
    await fs.writeFile(target, buffer)
  }
}

export async function saveOutput(bytes: Uint8Array, filename: string) {
  const outputId = `${crypto.randomUUID()}.pdf`

  if (hasBlobStorage()) {
    const blob = await put(`outputs/${outputId}`, bytes, {
      access: 'public',
      contentType: 'application/pdf',
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    return {
      id: outputId,
      downloadUrl: blob.downloadUrl || blob.url,
    }
  }

  await fs.mkdir(localOutputDir, { recursive: true })
  await fs.writeFile(path.join(localOutputDir, outputId), bytes)

  return {
    id: outputId,
    downloadUrl: `/api/pdf/download/${outputId}`,
  }
}

export async function getOutputFile(id: string) {
  const safeId = path.basename(id)

  if (hasBlobStorage()) {
    const result = await get(`outputs/${safeId}`, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    if (!result) return null

    return {
      stream: result.stream,
      contentType: result.blob.contentType || 'application/pdf',
      downloadUrl: result.blob.downloadUrl,
    }
  }

  try {
    return {
      buffer: await fs.readFile(path.join(localOutputDir, safeId)),
      contentType: 'application/pdf',
    }
  } catch {
    return null
  }
}

export async function storeClientUploadedFile(
  fileId: string,
  fileName: string,
  pages: number,
) {
  return { fileId, fileName, pages }
}
