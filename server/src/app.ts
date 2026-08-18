import Fastify from 'fastify'
import cors from '@fastify/cors'

export async function buildApp() {
  const app = Fastify({ logger: true })

  await app.register(cors, {
    origin: true,
  })

  app.get('/', async () => ({
    status: 'ok',
    service: 'ecom-label-pro-api',
    health: '/api/health',
  }))

  app.get('/api/health', async () => ({
    status: 'ok',
    service: 'ecom-label-pro-api',
  }))

  await app.ready()

  return app
}