import { buildApp } from './app.js'

const app = await buildApp()

if (process.env.VERCEL) {
  throw new Error('The Vercel serverless entrypoint must be used instead of src/server.ts')
}

await app.listen({
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || '0.0.0.0',
})

export default app
export { app }
