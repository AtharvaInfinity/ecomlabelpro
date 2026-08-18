import type { FastifyInstance } from 'fastify'
import { getOutputFile } from '../services/storage.service.js'

export async function downloadRoutes(app: FastifyInstance) {
  app.get('/api/pdf/download/:id', async (req, reply) => {
    try {
      const id = (req.params as { id: string }).id
      const result = await getOutputFile(id)

      if (!result) {
        return reply.status(404).send({
          message: 'Output PDF not found.',
        })
      }

      const requestedName =
        typeof (req.query as { name?: string })?.name === 'string'
          ? String((req.query as { name?: string }).name)
          : 'processed-pdf.pdf'

      const safeName = requestedName
        .toLowerCase()
        .endsWith('.pdf')
        ? requestedName
        : `${requestedName || 'processed-pdf'}.pdf`

      reply.header(
        'Content-Type',
        result.contentType || 'application/pdf',
      )

      reply.header(
        'Content-Disposition',
        `attachment; filename="${safeName.replace(/["\\]/g, '')}"`,
      )

      // Private Vercel Blob files are streamed through Railway.
      if ('stream' in result && result.stream) {
        return reply.send(result.stream)
      }

      if ('buffer' in result && result.buffer) {
        return reply.send(result.buffer)
      }

      return reply.status(404).send({
        message: 'Output PDF content is unavailable.',
      })
    } catch (error) {
      req.log.error(error)

      return reply.status(500).send({
        message:
          error instanceof Error
            ? error.message
            : 'Unable to download output PDF.',
      })
    }
  })
}