import react from '@vitejs/plugin-react'
import { defineConfig, type Connect, type Plugin } from 'vite'
import { GET as tiles } from './api/tiles.ts'
import { GET as horizons } from './api/horizons.ts'

type Handler = (request: Request) => Promise<Response>

/** Serves an api/ function in dev and preview, as Vercel does in production. */
function apiRoute(path: string, handler: Handler): Plugin {
  const handle = (server: { middlewares: Connect.Server }) => {
    server.middlewares.use(path, async (req, res) => {
      const response = await handler(new Request(new URL(req.originalUrl ?? req.url ?? '', 'http://localhost'), { method: req.method }))
      res.statusCode = response.status
      response.headers.forEach((value, key) => res.setHeader(key, value))
      res.end(Buffer.from(await response.arrayBuffer()))
    })
  }
  return { name: `api${path.replace(/\//g, '-')}`, configureServer: handle, configurePreviewServer: handle }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiRoute('/api/tiles', tiles), apiRoute('/api/horizons', horizons)],
  worker: { format: 'es' },
})
