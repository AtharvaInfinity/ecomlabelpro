import type { IncomingMessage, ServerResponse } from 'node:http'
import { buildApp } from '../src/lib/app.js'

let appPromise: ReturnType<typeof buildApp> | undefined

function getApp() {
  if (!appPromise) appPromise = buildApp()
  return appPromise
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  try {
    const app = await getApp()
    app.server.emit('request', req, res)
  } catch (error) {
    console.error('Ecom Label PRO serverless startup failed:', error)
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
    }
    res.end(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error',
    }))
  }
}
