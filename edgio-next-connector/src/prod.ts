/* istanbul ignore file */
import { join } from 'path'
import qs from 'qs'
import { createServer, Server } from 'http'
import nonWebpackRequire from '@edgio/core/utils/nonWebpackRequire'
import getDistDir from './util/getDistDir'
import path from 'path'
import getNextConfig from './getNextConfig'
import { REMOVE_HEADER_VALUE } from './router/constants'

// Used in fetchFromAPI so that SSR pages don't call back into the lambda
// which would result in Edgio being double-billed for each SSR request
process.env.API_HOST = `127.0.0.1:3001`

let server: Server

/**
 * Creates a server for target: 'server', output: 'standalone', which is the default from Next 12.2 onward.
 * @param port The port to which to bind the Next server
 */
const createStandAloneServer = (
  port: number,
  config: { experimental: { isrFlushToDisk: boolean } }
) => {
  // This is our custom build on next
  const NextServer = nonWebpackRequire('next/dist/server/next-server-optimized').default

  // Note: we considered using use minimal mode (process.env.NEXT_PRIVATE_MINIMAL_MODE = 'true') to prevent Next.js
  // from flushing ISR pages to disk, but that also disables middleware, so instead we force revalidate by
  // sending x-prerender-revalidate when making requests to Next. See NextRoutes for details.
  // disable next writing ISR generated html files to disk.
  config.experimental.isrFlushToDisk = false

  const handle = new NextServer({
    hostname: 'localhost',
    port: port,
    dir: path.resolve(__dirname, '..'),
    dev: false,
    conf: config,
  }).getRequestHandler()

  return createServer(async (req, res) => {
    try {
      // See NextRoutes#ssr. Here we add a default Cache-Control header before handing the request off to Next.js.
      // If Next.js sees this default value, it won't add it's own default, which is Cache-Control: private, no-cache, no-store.
      // We then remove this default value so that there is no Cache-Control header in NextRoutes#ssr
      res.setHeader('Cache-Control', REMOVE_HEADER_VALUE)
      handle(req, res)
    } catch (e) {
      const message = `An unexpected error occurred while processing the request with next.js.`
      console.error(e.stack)
      res.writeHead(500)
      res.end(message)
    }
  })
}

/**
 * Creates the server for the legacy target: 'serverless' configuration which was prominent
 * prior to Next 12
 */
const createServerlessServer = () => {
  const distDir = getDistDir()
  return createServer(async (req, res) => {
    const page = req.headers['x-next-page'] // sent by createNextRenderer
    const search = req.url?.split('?')[1]

    // @ts-ignore
    req.query = qs.parse(search)

    try {
      const pagePath = join(process.cwd(), distDir, 'serverless', 'pages', <string>page)
      const mod = nonWebpackRequire(pagePath)

      if (mod.getServerSideProps || mod.getStaticProps) {
        // Is a React component
        await mod.renderReqToHTML(
          req,
          res,
          undefined,
          undefined,
          /* pass params to context object supplied to getStaticProps, getServerSideProps */
          // @ts-ignore
          req.query
        )
      } else if (mod.render) {
        // getInitialProps
        await mod.render(req, res)
      } else {
        // API functions
        await mod.default(req, res)
      }
    } catch (e) {
      const message = `An unexpected error occurred while processing the request with next.js. (page="${page}")`
      console.error(e.stack)
      res.writeHead(500)
      res.end(message)
    }
  })
}

export default async function prod(port: number) {
  if (!server) {
    const config = getNextConfig()

    if (config.target === 'server') {
      server = createStandAloneServer(port, config)
    } else {
      server = createServerlessServer()
    }
  }

  return new Promise<void>((resolve, reject) => {
    try {
      server.listen(port, resolve)
    } catch (e) {
      reject(e)
    }
  })
}
