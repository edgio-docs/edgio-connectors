/* istanbul ignore file */
import { resolve } from 'path'
import qs from 'qs'
import { createServer, Server } from 'http'
import getNextRootDir from './util/getNextRootDir'
import { getDistDirFromConfig } from './util/getDistDir'
import getNextConfig from './getNextConfig'
import { NEXT_PAGE_HEADER, REMOVE_HEADER_VALUE } from './constants'
import { existsSync, createReadStream } from 'fs'
import getNextVersion from './util/getNextVersion'
import { satisfies } from 'semver'

// Used in fetchFromAPI so that SSR pages don't call back into the lambda
// which would result in Edgio being double-billed for each SSR request
process.env.API_HOST = `127.0.0.1:3001`

let server: Server | NextStartServer | undefined

// This is a copy of the Next.js start-server.js file, which is not exported.
interface StartServerOptions {
  dir: string
  port: number
  isDev: boolean
  hostname: string
  allowRetry?: boolean
  customServer?: boolean
  minimalMode?: boolean
  keepAliveTimeout?: number
}

type StartServer = (options: StartServerOptions) => Promise<void>

interface NextStartServer {
  listen: (port: number, resolve: any) => void
}

/**
 * Creates a Next.js server for target: 'server', output: 'standalone' using start-server.js module,
 * which is the default for Next.js >= 13.5.x.
 * Only this server provides the full functionality for Next.js >= 14.
 *
 * @param nextRootDir The root directory of the Next.js app where .next build output is located
 * @param port The port to which to bind the Next server
 * @param nextConfig The Next.js config object
 */
const createStartServer = async (
  nextRootDir: string,
  port: number,
  nextConfig: any
): Promise<NextStartServer> => {
  const relativeStartServerPath = 'node_modules/next/dist/server/lib/start-server.js'

  // Try to find the exact location of start-server.js
  const startServerPath = [
    resolve(relativeStartServerPath),
    resolve(nextRootDir, relativeStartServerPath),
  ].find(existsSync)

  if (!startServerPath) {
    throw new Error(`Could not find ${relativeStartServerPath}`)
  }

  // We need to use 'import()' with 'file://' prefix here as a workaround for Windows systems.
  // @ts-ignore
  const startServer: StartServer = (
    await import(/* webpackIgnore: true */ `file://${startServerPath}`)
  ).startServer

  const options: StartServerOptions = {
    hostname: '127.0.0.1',
    port: port,
    isDev: false,
    dir: resolve(nextRootDir),
  }

  // This new server is reading the next config from ENV variables
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig)

  return {
    listen: async (_port: number, resolve: any) => {
      await startServer(options)
      resolve()
    },
  }
}

/**
 * Creates a Next.js server for target: 'server', output: 'standalone' using next-server.js module,
 * which is the default from Next.js 12.2.x to 13.4.x.
 * NOTE: This server works for most use-cases with Next.js >=14 too, but it doesn't support the newest features.
 *
 * @param nextRootDir The root directory of the Next.js app where .next build output is located
 * @param port The port to which to bind the Next server
 * @param nextConfig The Next.js config object
 */
const createStandAloneServer = async (
  nextRootDir: string,
  port: number,
  nextConfig: { experimental: { isrFlushToDisk: boolean } }
) => {
  const relativeNextServerPath = 'node_modules/next/dist/server/next-server.js'
  const relativeNextServerOptimizedPath = 'node_modules/next/dist/server/next-server-optimized.js'

  // Try to find the exact location of next-server.js
  const nextServerPath = [
    // Try to find the optimized version of Next.js server first
    // and then fallback to non-optimized version.
    // For most of the cases, the first one should be found.
    resolve(relativeNextServerOptimizedPath),
    resolve(relativeNextServerPath),
    resolve(nextRootDir, relativeNextServerOptimizedPath),
    resolve(nextRootDir, relativeNextServerPath),
  ].find(existsSync)

  if (!nextServerPath) {
    throw new Error(`Could not find ${relativeNextServerPath}`)
  }

  // We need to use 'import()' with 'file://' prefix here as a workaround for Windows systems.
  // @ts-ignore
  let NextServer = await import(/* webpackIgnore: true */ `file://${nextServerPath}`)

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
    const pagesDir = resolve(nextRootDir, distDir, 'serverless', 'pages')

    // Get the page name from the 'x-next-page' header
    // and fallback to _error.js template if it doesn't exist
    let page: string = req.headers[NEXT_PAGE_HEADER]?.toString() || '_error'
    const search = req.url?.split('?')?.[1]

    // We need to parse the query string from the URL for Next.js to work properly
    // @ts-ignore
    req.query = qs.parse(search)

    // Renders provided page using one of Next.js render methods
    const renderJsPage = async (page: string) => {
      const jsPagePath = resolve(pagesDir, `${page}.js`)

      // We need to use 'import()' with 'file://' prefix here as a workaround for Windows systems.
      const mod = (await import(/* webpackIgnore: true */ `file://${jsPagePath}`))?.default

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
    }

    // Renders error page using 404.js, 500.js or _error.js template
    // NOTE: All these files don't need to be in the pages directory at all, but we need to try to use them first,
    // before falling back to the _error.js template because customers can have their own design in them
    // and _error.js would return the default error page from Next.js that doesn't look good.
    const renderErrorPage = async (page: string) => {
      // Set the correct status code for the error page
      res.statusCode = Number(page)
      const jsPagePath = resolve(pagesDir, `${page}.js`)
      const htmlPagePath = resolve(pagesDir, `${page}.html`)
      const htmlExists = existsSync(htmlPagePath)
      const jsExists = existsSync(jsPagePath)
      if (jsExists) {
        // If .js version of 404/500 page exist, render it as standard Next.js page
        return renderJsPage(page)
      }
      if (htmlExists) {
        // If pre-rendered version of 404/500.js files
        // without .js version exist (that means without revalidation),
        // return them directly.
        res.setHeader('Content-Type', 'text/html')
        return createReadStream(htmlPagePath).pipe(res)
      }
      // If neither .html nor .js version of 404/500 page exist,
      // render error page using _error.js template that is always present,
      // but doesn't need to be designed by the customer.
      return renderJsPage('_error')
    }

    try {
      // Customers can define their own error pages
      // using 404.js, 500.js or _error.js templates,
      // and we need to make sure that the correct one is returned.
      if (['500', '404'].includes(page)) {
        return renderErrorPage(page)
      }
      // Render all other pages using one of Next.js render methods
      return renderJsPage(page)
    } catch (e) {
      if (e instanceof Error) console.error(e.stack)
      res.writeHead(500)
      res.end(
        `ERROR: An unexpected error occurred while processing the request with Next.js. Requested page: "${page}"`
      )
    }
  })
}

const getNextServerType = (nextConfig: { target?: string }) => {
  // target option has been deprecated in next 13,
  // but we still need to support it for legacy projects,
  // so we reverse checking the target option as we know
  // that if it is not serverless, it must be server
  if (nextConfig.target === 'serverless' || nextConfig.target === 'experimental-serverless-trace') {
    return 'serverless'
  } else {
    const nextVersion = getNextVersion()
    const useStartServer = nextVersion ? satisfies(nextVersion, '>= 13.5.0') : false

    if (useStartServer) return 'start-server'
    else return 'server'
  }
}

export default async function prod(port: number) {
  if (!server) {
    // nextRootDir is relative location where the Next.js build is located in app folder.
    // This is the './' by default, but when the next app is built in NPM/YARN workspaces,
    // the path is different based on app location in the workspace.
    const nextRootDir = getNextRootDir()
    const nextConfig = getNextConfig(resolve(nextRootDir))
    const distDir = getDistDirFromConfig(nextConfig)
    const serverType = getNextServerType(nextConfig)

    if (serverType === 'serverless') {
      server = await createServerlessServer(nextRootDir, distDir)
    } else if (serverType === 'start-server') {
      server = await createStartServer(nextRootDir, port, nextConfig)
    } else {
      server = await createStandAloneServer(nextRootDir, port, nextConfig)
    }
  }

  return new Promise<void>((resolve, reject) => {
    try {
      server!.listen(port, resolve)
    } catch (e) {
      reject(e)
    }
  })
}
