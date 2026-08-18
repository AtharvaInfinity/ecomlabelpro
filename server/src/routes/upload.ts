import '@fastify/multipart'
import type { FastifyInstance } from 'fastify'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { PDFDocument } from 'pdf-lib'
import { put } from '@vercel/blob'

const localDir = path.resolve(process.cwd(), 'data/uploads')
const vercelLocalDir = '/tmp/ecom-label-pro/uploads'

function useBlobStorage() {
  return Boolean(process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN)
}

function getLocalDir() {
  return process.env.VERCEL ? vercelLocalDir : localDir
}

export async function uploadRoutes(app: FastifyInstance) {
  // Never create /var/task/data on Vercel. The deployed filesystem is read-only.
  // Local development continues to use data/uploads as before.
  if (!process.env.VERCEL) {
    await fs.mkdir(localDir, { recursive: true })
  }

  app.post('/api/pdf/upload', async (req, reply) => {
    try {
      const parts = req.files()
      const out: Array<{ fileId: string; fileName: string; pages: number }> = []

      if (!useBlobStorage()) {
        await fs.mkdir(getLocalDir(), { recursive: true })
      }

      for await (const part of parts) {
        if (part.type !== 'file') continue

        if (!part.filename.toLowerCase().endsWith('.pdf')) {
          return reply.status(400).send({ message: 'PDF files only.' })
        }

        const buf = await part.toBuffer()
        const pdf = await PDFDocument.load(buf)
        const id = `${crypto.randomUUID()}.pdf`

        if (useBlobStorage()) {
          // Store uploaded PDFs persistently in private Vercel Blob storage.
          await put(`uploads/${id}`, buf, {
            access: 'private',
            contentType: 'application/pdf',
            addRandomSuffix: false,
            token: process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN,
          })
        } else {
          await fs.writeFile(path.join(getLocalDir(), id), buf)
        }

        out.push({
          fileId: useBlobStorage() ? `uploads/${id}` : id,
          fileName: part.filename,
          pages: pdf.getPageCount(),
        })
      }

      if (!out.length) {
        return reply.status(400).send({ message: 'No PDF files uploaded.' })
      }

      return { files: out }
    } catch (e) {
      req.log.error(e)
      return reply.status(500).send({
        message: e instanceof Error ? e.message : 'Upload failed.',
      })
    }
  })
}
