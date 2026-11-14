import react from '@vitejs/plugin-react'
import { defineConfig, type Connect, type Plugin } from 'vite'
import { GET as tiles } from './api/tiles.ts'
import { GET as horizons } from './api/horizons.ts'
import { GET as elevation } from './api/elevation.ts'
import { GET as roverPhotos } from './api/rover-photos.ts'

type Handler = (request: Request) => Promise<Response>

/** Serves an api/ function in dev and preview, as Vercel does in production. */
function apiRoute(path: string, handler: Handler): Plugin {
  const handle = (server: { middlewares: Connect.Server }) => {
    server.middlewares.use(path, async (req, res, next) => {
      // The prefix also matches the module itself (/api/tiles.ts), which the app imports in dev; let Vite serve that
      const url = req.originalUrl ?? req.url ?? ''
      if (!/^[/?]/.test(url.slice(path.length))) return next()
      const response = await handler(new Request(new URL(url, 'http://localhost'), { method: req.method }))
      res.statusCode = response.status
      response.headers.forEach((value, key) => res.setHeader(key, value))
      res.end(Buffer.from(await response.arrayBuffer()))
    })
  }
  return { name: `api${path.replace(/\//g, '-')}`, configureServer: handle, configurePreviewServer: handle }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiRoute('/api/tiles', tiles), apiRoute('/api/horizons', horizons), apiRoute('/api/elevation', elevation), apiRoute('/api/rover-photos', roverPhotos)],
  worker: { format: 'es' },
})
