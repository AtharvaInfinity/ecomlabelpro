import type { FastifyInstance } from 'fastify'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { PDFDocument } from 'pdf-lib'
import { materializeUploads, getLocalUploadPath, saveOutput } from '../services/storage.service.js'

const uploadDir = process.env.VERCEL
  ? '/tmp/ecom-label-pro/uploads'
  : path.resolve(process.cwd(), 'data/uploads')
const outputDir = process.env.VERCEL
  ? '/tmp/ecom-label-pro/outputs'
  : path.resolve(process.cwd(), 'data/outputs')

type MergeBody = {
  files?: Array<{
    fileId?: string
    fileName?: string
  }>
}

export async function mergePdfRoutes(app: FastifyInstance) {
  await fs.mkdir(uploadDir, { recursive: true })
  await fs.mkdir(outputDir, { recursive: true })

  app.post('/api/pdf/merge', async (req, reply) => {
    try {
      const body = (req.body ?? {}) as MergeBody

      if (!Array.isArray(body.files) || body.files.length < 2) {
        return reply.status(400).send({
          message: 'Select at least 2 PDF files to merge.',
        })
      }

      if (body.files.length > 20) {
        return reply.status(400).send({
          message: 'You can merge up to 20 PDF files at a time.',
        })
      }

      const selectedFiles = body.files.filter(
        (item): item is { fileId: string; fileName: string; pages: number } =>
          typeof item.fileId === 'string' && item.fileId.length > 0 &&
          typeof item.fileName === 'string',
      )

      if (selectedFiles.length !== body.files.length) {
        return reply.status(400).send({
          message: 'One or more selected PDFs is missing its file ID or file name.',
        })
      }

      await materializeUploads(selectedFiles)

      const merged = await PDFDocument.create()

      for (const item of selectedFiles) {
        if (!item.fileId) {
          return reply.status(400).send({ message: 'A selected PDF is missing its file ID.' })
        }

        const safeId = path.basename(item.fileId)
        const sourcePath = getLocalUploadPath(safeId)
        const sourceBytes = await fs.readFile(sourcePath)
        const sourcePdf = await PDFDocument.load(sourceBytes)
        const pages = await merged.copyPages(sourcePdf, sourcePdf.getPageIndices())

        for (const page of pages) {
          merged.addPage(page)
        }
      }

      if (merged.getPageCount() === 0) {
        return reply.status(400).send({ message: 'The selected PDFs contain no pages.' })
      }

      const bytes = await merged.save()
      const savedOutput = await saveOutput(bytes, 'merged-pdfs.pdf')

      return {
        fileId: savedOutput.id,
        fileName: 'merged-pdfs.pdf',
        pages: merged.getPageCount(),
        files: selectedFiles.length,
        downloadUrl: savedOutput.downloadUrl,
      }
    } catch (error) {
      req.log.error(error)
      return reply.status(500).send({
        message: error instanceof Error ? error.message : 'PDF merge failed.',
      })
    }
  })
}
