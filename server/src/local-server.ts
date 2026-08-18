import { buildApp } from './lib/app.js'

const app = await buildApp()

await app.listen({
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || '0.0.0.0',
})

export default app
export { app }
