import type { IncomingMessage, ServerResponse } from 'node:http'
import { buildApp } from '../src/app.js'

let appPromise: ReturnType<typeof buildApp> | undefined

function getApp() {
  if (!appPromise) appPromise = buildApp()
  return appPromise
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const app = await getApp()
  app.server.emit('request', req, res)
}
