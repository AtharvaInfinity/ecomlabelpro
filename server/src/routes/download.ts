import type { FastifyInstance } from 'fastify'
import { getOutputFile } from '../services/storage.service.js'

export async function downloadRoutes(app: FastifyInstance) {
  app.get('/api/pdf/download/:id', async (req, reply) => {
    try {
      const id = (req.params as { id: string }).id
      const result = await getOutputFile(id)

      if (!result) {
        return reply.status(404).send({ message: 'Output PDF not found.' })
      }

      const requestedName =
        typeof (req.query as { name?: string })?.name === 'string'
          ? String((req.query as { name?: string }).name)
          : 'processed-pdf.pdf'

      const safeName = requestedName.toLowerCase().endsWith('.pdf')
        ? requestedName
        : `${requestedName || 'processed-pdf'}.pdf`

      if ('downloadUrl' in result && result.downloadUrl) {
        return reply.redirect(result.downloadUrl)
      }

      reply.header('Content-Type', result.contentType || 'application/pdf')
      reply.header(
        'Content-Disposition',
        `attachment; filename="${safeName.replace(/["\\]/g, '')}"`,
      )

      return reply.send(result.buffer)
    } catch (error) {
      req.log.error(error)
      return reply.status(404).send({ message: 'Output PDF not found.' })
    }
  })
}
