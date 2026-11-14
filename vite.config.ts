import react from '@vitejs/plugin-react'
import { defineConfig, type Connect, type Plugin } from 'vite'
import { GET as tiles } from './api/tiles.ts'

/** Serves api/tiles.ts in dev and preview, as Vercel does in production. */
function tilesApi(): Plugin {
  const handle = (server: { middlewares: Connect.Server }) => {
    server.middlewares.use('/api/tiles', async (req, res) => {
      const response = await tiles(
        new Request(new URL(req.originalUrl ?? req.url ?? '', 'http://localhost'), { method: req.method }),
      )
      res.statusCode = response.status
      response.headers.forEach((value, key) => res.setHeader(key, value))
      res.end(Buffer.from(await response.arrayBuffer()))
    })
  }
  return { name: 'tiles-api', configureServer: handle, configurePreviewServer: handle }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tilesApi()],
  worker: { format: 'es' },
})
