/* istanbul ignore file */
import nonWebpackRequire from '@layer0/core/utils/nonWebpackRequire'
import { createServer } from 'http'

export default async function prod(port: number) {
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
      console.error(e.stack)
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
