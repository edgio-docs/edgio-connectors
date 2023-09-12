/* istanbul ignore file */
import { createServer } from 'http'
import fs from 'fs'
import nonWebpackRequire from '@edgio/core/utils/nonWebpackRequire'

export default async function prod(port: number) {
  const config = JSON.parse(fs.readFileSync('.edgio/edgio-nuxt.config.json').toString())
  if (config.target !== 'static') {
    const { loadNuxt } = nonWebpackRequire('@nuxt/core')
    let nuxt: any

    const server = createServer(async (req, res) => {
      try {
        // for @nuxt/http - see https://http.nuxtjs.org/api/#baseurl
        // Note that is critical that we set API_URL before calling loadNuxt, or @nuxt/http will not pick it up
        const hostname = <string>req.headers['host']
        const protocol = /^(localhost|127.0.0.1):\d+$/.test(hostname) ? 'http' : 'https'
        process.env.API_URL = `${protocol}://${hostname}`

        if (!nuxt) {
          nuxt = await loadNuxt('start')
        }

        await nuxt.render(req, res)
      } catch (e) {
        const message = 'An unexpected error occurred while processing the request with nuxt.js.'
        console.error(e instanceof Error ? e.message : e)
        res.writeHead(500)
        res.end(message)
      }
    })

    return new Promise((resolve, reject) => {
      try {
        server.on('listening', resolve)
        server.listen(port)
      } catch (e) {
        reject(e)
      }
    })
  }
}
