/* istanbul ignore file */
import { resolve } from 'path'
import qs from 'qs'
import { createServer, Server } from 'http'
import getNextRootDir from './util/getNextRootDir'
import { getDistDirFromConfig } from './util/getDistDir'
import getNextConfig from './getNextConfig'
import { NEXT_PAGE_HEADER, REMOVE_HEADER_VALUE } from './constants'
import { existsSync } from 'fs'

// Used in fetchFromAPI so that SSR pages don't call back into the lambda
// which would result in Edgio being double-billed for each SSR request
process.env.API_HOST = `127.0.0.1:3001`

let server: Server

/**
 * Creates a server for target: 'server', output: 'standalone', which is the default from Next 12.2 onward.
 * @param nextRootDir The root directory of the Next.js app where .next build output is located
 * @param port The port to which to bind the Next server
 * @param nextConfig The Next.js config object
 */
const createStandAloneServer = async (
  nextRootDir: string,
  port: number,
  nextConfig: { experimental: { isrFlushToDisk: boolean } }
) => {
  // Try to find the optimized version of Next.js server first
  const nextServerPath = [
    resolve(nextRootDir, 'node_modules/next/dist/server/next-server-optimized.js'),
    resolve(nextRootDir, 'node_modules/next/dist/server/next-server.js'),
  ].find(existsSync)

  // @ts-ignore
  let NextServer = await import(/* webpackIgnore: true */ nextServerPath)
  // Try to find the default export
  NextServer = NextServer?.default?.default || NextServer?.default || NextServer

  // Note: we considered using use minimal mode (process.env.NEXT_PRIVATE_MINIMAL_MODE = 'true') to prevent Next.js
  // from flushing ISR pages to disk, but that also disables middleware, so instead we force revalidate by
  // sending x-prerender-revalidate when making requests to Next. See NextRoutes for details.
  // disable next writing ISR generated html files to disk.
  nextConfig.experimental.isrFlushToDisk = false

  const handle = new NextServer({
    hostname: 'localhost',
    port: port,
    dir: resolve(nextRootDir),
    dev: false,
    conf: nextConfig,
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
const createServerlessServer = async (nextRootDir: string, distDir: string) => {
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
      const pagePath = resolve(nextRootDir, distDir, 'serverless', 'pages', `${page}.js`)
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
    // nextRootDir is relative location where the Next.js build is located in app folder.
    // This is the './' by default, but when the next app is built in NPM/YARN workspaces,
    // the path is different based on app location in the workspace.
    const nextRootDir = getNextRootDir()
    const nextConfig = getNextConfig(resolve(nextRootDir))
    const distDir = getDistDirFromConfig(nextConfig)

    // target option has been depricated in next 13,
    // but we still need to support it for legacy projects
    // so we reverse checking the target option as we know
    // that if it is not serverless, it must be server
    if (
      nextConfig.target === 'serverless' ||
      nextConfig.target === 'experimental-serverless-trace'
    ) {
      server = await createServerlessServer(nextRootDir, distDir)
    } else {
      server = await createStandAloneServer(nextRootDir, port, nextConfig)
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
