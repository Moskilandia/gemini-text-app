import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import VitePluginSitemap from 'vite-plugin-sitemap';
import OpenAI from 'openai'

function devChatApiPlugin(mode: string): Plugin {
  return {
    name: 'dev-chat-api',
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), '')
      const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY
      const model = env.OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini'

      const client = apiKey ? new OpenAI({ apiKey }) : null

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/chat')) return next()

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        if (!client) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }))
          return
        }

        try {
          const bodyText = await new Promise<string>((resolve, reject) => {
            let data = ''
            req.on('data', (chunk) => {
              data += chunk
            })
            req.on('end', () => resolve(data))
            req.on('error', reject)
          })

          const body = bodyText ? JSON.parse(bodyText) : {}
          const messages = Array.isArray(body?.messages) ? body.messages : []

          const completion = await client.chat.completions.create({
            model,
            messages,
            temperature: 0.7,
          })

          const text = completion.choices?.[0]?.message?.content?.trim() || ''

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ text }))
        } catch (error) {
          console.error('[dev-chat-api] error:', error)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Server error' }))
        }
      })
    },
  }
}

// https://vitejs.dev/config/
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",            // 👈 REQUIRED for Netlify + custom domain
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
