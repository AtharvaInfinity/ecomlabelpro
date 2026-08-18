import { buildApp } from '../src/lib/app.js'

let appPromise: ReturnType<typeof buildApp> | undefined

function getApp() {
  if (!appPromise) {
    appPromise = buildApp()
  }

  return appPromise
}

export default async function handler(req: any, res: any) {
  const app = await getApp()

  app.server.emit('request', req, res)
}
