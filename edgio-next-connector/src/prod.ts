/* istanbul ignore file */
import { resolve } from 'path'
import qs from 'qs'
import { createServer, Server } from 'http'
import getDistDir from './util/getDistDir'
import getNextConfig from './getNextConfig'
import { NEXT_PAGE_HEADER, REMOVE_HEADER_VALUE } from './constants'
import { existsSync } from 'fs'

// Used in fetchFromAPI so that SSR pages don't call back into the lambda
// which would result in Edgio being double-billed for each SSR request
process.env.API_HOST = `127.0.0.1:3001`

let server: Server

/**
 * Creates a server for target: 'server', output: 'standalone', which is the default from Next 12.2 onward.
 * @param port The port to which to bind the Next server
 */
const createStandAloneServer = async (
  port: number,
  config: { experimental: { isrFlushToDisk: boolean } }
) => {
  // Try to find the optimized version of Next.js server first
  const nextServerPath = [
    resolve('node_modules/next/dist/server/next-server-optimized.js'),
    resolve('node_modules/next/dist/server/next-server.js'),
  ].find(existsSync)

  // @ts-ignore
  let NextServer = await import(/* webpackIgnore: true */ nextServerPath)
  // Try to find the default export
  NextServer = NextServer?.default?.default || NextServer?.default || NextServer

  // Note: we considered using use minimal mode (process.env.NEXT_PRIVATE_MINIMAL_MODE = 'true') to prevent Next.js
  // from flushing ISR pages to disk, but that also disables middleware, so instead we force revalidate by
  // sending x-prerender-revalidate when making requests to Next. See NextRoutes for details.
  // disable next writing ISR generated html files to disk.
  config.experimental.isrFlushToDisk = false

  const handle = new NextServer({
    hostname: 'localhost',
    port: port,
    dir: process.cwd(),
    dev: false,
    conf: config,
  }).getRequestHandler()

  return createServer(async (req, res) => {
    try {
      // Here we add a default Cache-Control header before handing the request off to Next.js.
      // If Next.js sees this default value, it won't add its own default, which is Cache-Control: private, no-cache, no-store.
      // We later remove this value so that there is no Cache-Control header in NextRoutes#addDefaultSSRRoute.
      res.setHeader('Cache-Control', REMOVE_HEADER_VALUE)
      handle(req, res)
    } catch (e) {
      if (e instanceof Error) {
        console.error(e.stack)
      }
      res.writeHead(500)
      res.end(`An unexpected error occurred while processing the request with next.js.`)
    }
  })
}

/**
 * Creates the server for the legacy target: 'serverless' configuration which was prominent
 * prior to Next 12
 */
const createServerlessServer = async () => {
  const distDir = getDistDir()
  return createServer(async (req, res) => {
    let page: string | undefined = req.headers[NEXT_PAGE_HEADER] as string
    const search = req.url?.split('?')[1]

    // Return correct error page with template from _error.js
    if (['404', '500'].includes(page)) {
      page = '_error'
      res.statusCode = Number(page)
    }

    // @ts-ignore
    req.query = qs.parse(search)

    try {
      const pagePath = resolve(distDir, 'serverless', 'pages', `${page}.js`)
      const mod = (await import(/* webpackIgnore: true */ pagePath))?.default

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
      if (e instanceof Error) {
        console.error(e.stack)
      }
      res.writeHead(500)
      res.end(
        `An unexpected error occurred while processing the request with next.js. (page="${page}")`
      )
    }
  })
}

export default async function prod(port: number) {
  if (!server) {
    const config = getNextConfig()

    // target option has been depricated in next 13,
    // but we still need to support it for legacy projects
    // so we reverse checking the target option as we know
    // that if it is not serverless, it must be server
    if (config.target === 'serverless' || config.target === 'experimental-serverless-trace') {
      server = await createServerlessServer()
    } else {
      server = await createStandAloneServer(port, config)
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
