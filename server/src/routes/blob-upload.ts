import type { FastifyInstance } from 'fastify'
import {
  handleUpload,
  type HandleUploadBody,
} from '@vercel/blob/client'

export async function blobUploadRoutes(app: FastifyInstance) {
  app.post('/api/blob/upload', async (req, reply) => {
    try {
      const token = process.env.BLOB_READ_WRITE_TOKEN

      if (!token) {
        return reply.status(500).send({
          message:
            'Vercel Blob is not configured. Add BLOB_READ_WRITE_TOKEN to Railway environment variables.',
        })
      }

      const body = (req.body ?? {}) as HandleUploadBody

      const forwardedProto =
        String(req.headers['x-forwarded-proto'] || '')
          .split(',')[0]
          .trim()

      const protocol =
        forwardedProto ||
        (process.env.NODE_ENV === 'production' ? 'https' : 'http')

      const host =
        req.headers.host ||
        process.env.RAILWAY_PUBLIC_DOMAIN ||
        'localhost:4000'

      const requestUrl = `${protocol}://${host}${req.url}`

      const webRequest = new Request(requestUrl, {
        method: req.method,
        headers: new Headers(
          req.headers as Record<string, string>,
        ),
        body: JSON.stringify(body),
      })

      const jsonResponse = await handleUpload({
        token,
        body,
        request: webRequest,

        onBeforeGenerateToken: async (
          pathname: string,
          clientPayload: string | null,
        ) => {
          let payload: { fileName?: string } = {}

          if (clientPayload) {
            try {
              payload = JSON.parse(clientPayload)
            } catch {
              // Ignore invalid optional client payload.
            }
          }

          return {
            allowedContentTypes: ['application/pdf'],

            maximumSizeInBytes:
              50 * 1024 * 1024,

            addRandomSuffix: true,

            access: 'public',

            tokenPayload: JSON.stringify({
              fileName:
                payload.fileName || pathname,
            }),
          }
        },
      })

      return reply.send(jsonResponse)
    } catch (error) {
      req.log.error(error)

      return reply.status(500).send({
        message:
          error instanceof Error
            ? error.message
            : 'Unable to create Blob upload token.',
      })
    }
  })
}