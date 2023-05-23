import { isCloud, isLocal, isProductionBuild } from '@edgio/core/environment'
import NextPathFormatter from './nextPathFormatter'
import { getDistDirFromConfig } from '../util/getDistDir'
import { join } from 'path'
import { RouterPlugin } from '@edgio/core/router/Router'
import Router from '@edgio/core/router/Router'
import RouteCriteria from '@edgio/core/router/RouteCriteria'
import { getConfig } from '@edgio/core/config'
import getNextConfig from '../getNextConfig'
import RouteHelper, { FeatureCreator } from '@edgio/core/router/RouteHelper'
import { IMAGE_OPTIMIZER_ORIGIN_NAME, SERVERLESS_ORIGIN_NAME } from '@edgio/core/origins'
import {
  FAR_FUTURE_CACHE_CONFIG,
  PUBLIC_CACHE_CONFIG,
  SHORT_PUBLIC_CACHE_CONFIG,
} from './cacheConfig'
import ManifestParser from './ManifestParser'
import {
  NEXT_PAGE_HEADER,
  NEXT_PRERENDERED_PAGES_FOLDER,
  REMOVE_HEADER_VALUE,
  SERVICE_WORKER_FILENAME,
} from '../constants'
import chalk from 'chalk'
import { EDGIO_IMAGE_OPTIMIZER_PATH, edgioRoutes } from '@edgio/core'
import {
  RenderMode,
  Page,
  PAGE_TYPES,
  FALLBACK_TYPES,
  RENDER_MODES,
  ExtendedConfig,
} from '../types'
import getRenderMode from '../util/getRenderMode'
import qs from 'qs'
import ParamsExtractor from '@edgio/core/router/ParamsExtractor'
import setNextPage from './setNextPage'
import Request from '@edgio/core/runtime/Request'
import Response from '@edgio/core/runtime/Response'
import getBuildId from '../util/getBuildId'
import { PreloadRequest } from '@edgio/core/router/Preload'
import bindParams from '@edgio/core/utils/bindParams'
import { getBackReferences } from '@edgio/core/router/path'
import { pathToRegexp } from 'path-to-regexp'

export default class NextRoutes implements RouterPlugin {
  protected router?: Router
  protected nextRootDir: string
  protected defaultLocale?: string
  protected locales: string[] = []
  protected rewrites: any = {}
  protected redirects: any[] = []
  protected pages: Page[] = []
  protected pagesMap: { [key: string]: Page } = {}
  protected distDir: string
  protected buildId: string = 'dev'
  protected previewModeId: string | undefined
  protected nextConfig: any
  protected edgioConfig: ExtendedConfig
  protected nextPathFormatter: NextPathFormatter
  protected manifestParser: ManifestParser
  protected renderMode: RenderMode

  /**
   * Provides next registered routes to router
   * @param nextRootDir The root directory for the Next.js app
   */
  constructor(nextRootDir: string = '.') {
    this.nextRootDir = nextRootDir
    this.edgioConfig = getConfig() as ExtendedConfig
    this.nextConfig = getNextConfig(join(process.cwd(), nextRootDir))
    this.distDir = getDistDirFromConfig(this.nextConfig)
    this.renderMode = getRenderMode(this.nextConfig)
    this.nextPathFormatter = new NextPathFormatter(this.nextConfig)

    // ManifestParser loads pages from the Next.js app
    // and collect all information about each of them.
    // The pages are loaded from manifest files in production mode
    // and from the pages and app folders in development mode. The pages in dev mode are all marked as SSR.
    this.manifestParser = new ManifestParser(this.nextRootDir, this.distDir, this.renderMode)
    this.pages = this.manifestParser.getPages()
    this.pagesMap = Object.fromEntries(this.pages.map(page => [page.name, page]))
    this.redirects = this.manifestParser.getRedirects()
    this.rewrites = this.manifestParser.getRewrites()
    this.locales = this.manifestParser.getLocales()
    this.defaultLocale = this.manifestParser.getDefaultLocale()

    // Production mode
    if (isProductionBuild() || isCloud()) {
      this.buildId = getBuildId(join(nextRootDir, this.distDir))
    }
  }

  /**
   * Called when plugin is registered
   * @param router The router to which the plugin has been added.
   */
  onRegister(router: Router) {
    this.router = router

    this.logDuringBuild(`> Next.js routes (locales: ${this.locales?.join(', ') || 'none'})`)
    this.logDuringBuild('')
    if (this.edgioConfig?.next?.proxyToServerlessByDefault !== false) {
      this.addDefaultSSRRoute()
    }
    this.addPages()
    this.addPrerenderedPages()
    this.addPublicAssets()
    this.addAssets()
    this.addImageOptimizer()
    this.addRewrites()
    this.addRedirects()
    this.addServiceWorker()
    this.addPrerendering()
    this.logDuringBuild('')

    this.router.use(edgioRoutes)
  }

  /**
   * Adds executes addPage() for all pages extracted by the manifest parser
   */
  protected addPages() {
    this.pages.forEach(page => this.addPage(page))
  }

  /**
   * Adds routes for pre-rendered pages
   */
  protected addPrerenderedPages() {
    let routes: string[] = []
    let dataRoutes: string[] = []

    this.pages.forEach(page =>
      page?.prerenderedRoutes?.forEach(nextRoute => {
        // This condition ensures that pre-rendered pages on S3 that should expire will be ignored.
        // TODO: Remove this part once we'll know how updating files on S3 by XBP is working.
        if (page.initialRevalidateSeconds) return

        const routeAsset = `${NEXT_PRERENDERED_PAGES_FOLDER}${nextRoute}/index.html`
        let route = this.nextPathFormatter.toRouteSyntax(nextRoute)
        let dataRoute = this.nextPathFormatter.getDataRoute(nextRoute, this.buildId)

        // Apply modifiers to routes
        route = this.addBasePath(route)
        dataRoute = this.addBasePath(dataRoute)

        // Log route
        this.logRoute(page, route, 'html')
        // Log data route
        if (page?.dataRoute) this.logRoute(page, dataRoute, 'json')

        // When page is dynamic with params and has no data route,
        // we need to create a separate dynamic route
        // Example: /en-US/ssg/[id] => Path: /en-US/ssg/:id, Asset: /en-US/ssg/[id]/index.html
        if (page?.isDynamic && !page?.dataRoute) {
          // Create separate rule
          this.router?.match(route, ({ serveStatic, cache, setComment }) => {
            setComment('Serve pre-rendered page with dynamic route and no getStaticPaths')
            serveStatic(routeAsset)
            cache(PUBLIC_CACHE_CONFIG)
          })
          // No need to add data route, so we're done
          return
        }
        // Add to single rule
        routes.push(route)
        dataRoutes.push(dataRoute)
      })
    )

    // We're done when we don't have any page routes
    if (routes.length === 0) return

    // We need to add variations with trailing slash,
    // so the pages are always matched even when enforceTrailingSlash is disabled.
    routes = routes.flatMap(route => (route === '/' ? [route] : [route, `${route}/`]))

    // Match all pre-rendered routes with a single route handler.
    // We can do this only for pre-rendered pages because the "IN" operator doesn't work with dynamic routes.
    // We need to disable browser cache for all HTML pages so the user always
    // have the latest version of the page when app is redeployed.
    this.router?.match({ path: routes }, ({ serveStatic, setResponseCode, setComment, cache }) => {
      setComment('Serve all pre-rendered HTML pages (getStaticPaths)')
      serveStatic(`${NEXT_PRERENDERED_PAGES_FOLDER}/:path*/index.html`)
      setResponseCode(200)
      cache(PUBLIC_CACHE_CONFIG)
    })

    // We're done when we don't have any data routes
    if (dataRoutes.length === 0) return

    // Match all pre-rendered data routes with a single route handler.
    // Data routes contains buildId in the path, so we can cache it in browser.
    this.router?.match(
      { path: dataRoutes },
      ({ serveStatic, cache, setResponseCode, setComment }) => {
        setComment('Serve all pre-rendered JSON data files (getStaticPaths)')
        serveStatic(`${NEXT_PRERENDERED_PAGES_FOLDER}/:path*`, {
          permanent: true,
        })
        setResponseCode(200)
        cache(FAR_FUTURE_CACHE_CONFIG)
      }
    )
  }

  /**
   * Adds routes for defined page
   */
  protected addPage(page: Page) {
    // Skip pages which are pure SSG (addPrerenderedPages will handle them)
    if (page.type === PAGE_TYPES.ssg && !page.initialRevalidateSeconds) return

    this.logPage(page)

    const routeHandlers: Array<FeatureCreator> = []
    const dataRouteHandlers: Array<FeatureCreator> = []

    // Add SSR handler to all pages when addDefaultSSRRoute was not added.
    // This will generate a separate rule for all not pre-rendered pages.
    if (this.edgioConfig?.next?.proxyToServerlessByDefault === false) {
      routeHandlers.push(this.ssrHandler)
      dataRouteHandlers.push(this.ssrHandler)
    }

    // Add request header with page name to all pages except SSG.
    // This is used to determine which page is being rendered in serverless mode
    // when request reaches serverless origin.
    // To not generate extensive amount of routes, we add this header only in serverless mode.
    if (this.renderMode === RENDER_MODES.serverless) {
      routeHandlers.push(routeHelper => setNextPage(page.name, routeHelper))
      dataRouteHandlers.push(routeHelper => setNextPage(page.name, routeHelper))
    }

    // Return a 404 page when a request comes in for a fallback:false page that is not pre-rendered
    if (page?.fallback === FALLBACK_TYPES.false) {
      const assetPath =
        NEXT_PRERENDERED_PAGES_FOLDER +
        this.addBasePath(`/${this.locales.length > 0 ? ':locale/' : ''}`)

      routeHandlers.push(({ setComment, serveStatic, setResponseCode }) => {
        // Serve static not found page for all not pre-rendered routes.
        // We want to serve HTML error page even for data route.
        setComment('Serve 404 for HTML paths not returned by getStaticPaths (fallback: false)')
        serveStatic(`${assetPath}/404/index.html`.replace(/\/+/g, '/'))
        setResponseCode(404)
      })

      dataRouteHandlers.push(({ setComment, setResponseCode }) => {
        // Serve static not found page for all not pre-rendered routes.
        // We want to serve HTML error page even for data route.
        setComment('Serve 404 for JSON paths not returned by getStaticPaths (fallback: false)')
        setResponseCode(404)
      })
    }

    // This ensures that we will have all features for one route in one rule
    // instead of having multiple rules for one route.
    // Call all route handlers for route.
    if (routeHandlers.length > 0) {
      const modifiedRoute = this.addBasePath(page.localizedRoute)
      this.router?.match(modifiedRoute, routeHelper => {
        routeHandlers.forEach(handler => handler(routeHelper))
      })
    }
    // Call all route handlers for data route.
    if (dataRouteHandlers.length > 0 && page?.localizedDataRoute) {
      const modifiedDataRoute = this.addBasePath(page.localizedDataRoute)
      this.router?.match(modifiedDataRoute, routeHelper => {
        dataRouteHandlers.forEach(handler => handler(routeHelper))
      })
    }
  }

  /**
   * Logs provided route with label to the console during the build.
   * @param page
   * @param route
   * @param label
   * @returns
   */
  logRoute(page: Page, route: string, label: string) {
    const parameters = []

    if (page.fallback) {
      parameters.push(chalk.grey(`${page.fallback}`))
    }

    if (page.initialRevalidateSeconds) {
      parameters.push(chalk.grey(`revalidate: ${page.initialRevalidateSeconds}`))
    }

    const type = `${page.type}${label ? ' ' + label : ''}`
    const params = parameters.length > 0 ? chalk.grey(` (${parameters.join(', ')})`) : ''

    this.logDuringBuild(`  ${chalk.blueBright(type)}${params}: ${route}`)
  }

  /**
   * Logs a page and its data route to the console during the build.
   * @param page
   * @returns
   */
  logPage(page: Page) {
    const localizedRoute = this.addBasePath(page.localizedRoute)
    if (!page.dataRoute || !page.localizedDataRoute) return this.logRoute(page, localizedRoute, '')

    const localizedDataRoute = this.addBasePath(page.localizedDataRoute || '')
    this.logRoute(page, localizedRoute, 'html')
    this.logRoute(page, localizedDataRoute, 'json')
  }

  /**
   * Outputs a message to the console during the build.
   * @param message
   * @returns
   */
  logDuringBuild(message: string) {
    if (isProductionBuild() && !isCloud()) console.log(message)
  }

  /**
   * Finds a backend in edgio.config.js that has the same hostname as the specified rewrite destination URL.
   * @param url
   * @returns
   */
  protected backendForDestination(url: URL) {
    return (
      getConfig()?.hostnames?.find(config => config?.hostname === url.hostname)
        ?.default_origin_name || SERVERLESS_ORIGIN_NAME
    )
  }

  /**
   * Find an existing route that would match a request with destination as the path - we will run its handler when
   * the request's path matches the rewrite source.
   * @param source The source URL
   * @param has Any has elements
   * @param destination The destination URL
   */
  protected addRewrite(source: string, has: any[] | undefined, destination: string) {
    // Next.js adds /:nextInternalLocale at the start of the destination route - if we leave this in
    // we'll never find the destination route
    let normalizedDestination = destination.replace(/\/:nextInternalLocale[^/]*/, '')

    if (this.defaultLocale) {
      // Use the defaultLocale in place of the the :locale parameter since we restrict the locale to only the
      // configured locales. If we don't do this, we'll never find the destination route.
      normalizedDestination = normalizedDestination.replace(/:locale/, this.defaultLocale)
    }

    this.logDuringBuild(`  ${chalk.blueBright('rewrite')}: ${source} => ${normalizedDestination}`)

    if (destination.match(/^https?:\/\//)) {
      const url = new URL(destination)
      const backend = this.backendForDestination(url)

      if (backend) {
        // proxy
        this.router?.match(this.createRouteCriteria(source, has), ({ proxy, updatePath }) => {
          updatePath(url.pathname)
          proxy(backend, {
            path: url.pathname,
          })
        })
      } else {
        console.warn(
          `No matching backend was found in edgio.config.js for rewrite to ${url.toString()}. ` +
            `To fix this problem, add key to the backends config with the following value: { "domainOrIp": "${url.hostname}" }. ` +
            `See https://docs.edg.io/guides/edgio_config#section_backends for more information.`
        )
      }
    } else {
      // render
      this.router?.match(this.createRouteCriteria(source, has), ({ rewritePath }) => {
        // TODO: Check the old implementation behaviour and make sure it works the same say
        rewritePath(source, normalizedDestination)
      })
    }
  }

  protected addRewrites() {
    if (!this.rewrites) return
    let rewrites = []

    if (Array.isArray(this.rewrites)) {
      // Rewrites can be either array of rewrites
      rewrites = this.rewrites
    } else {
      // Or an object with beforeFiles, afterFiles and fallback properties

      // We can't properly support this with edge-control at this moment.
      // The inner rewrite from serveStatic would always override the rewrite from beforeFiles,
      // because the sailfish is executing only the last rewrite, and we can't stop the rules execution flow.
      // Possible solution is to put all beforeFiles rewrites into same rule with the router.static,
      // but this would work only for static files and it is not possible right now because of bug SAIL-5897.
      // TODO: Refactor this when SAIL-5897 is fixed
      rewrites = [
        ...(this.rewrites.beforeFiles || []),
        ...(this.rewrites.afterFiles || []),
        ...(this.rewrites.fallback || []),
      ]
    }

    for (let { source, destination, has } of rewrites) {
      this.addRewrite(source, has, destination)
    }
  }

  /**
   * Adds rewrites and redirects from next.config.js
   */
  protected addRedirects() {
    if (!this.redirects) return

    for (let { source, has, statusCode, destination, internal } of this.redirects) {
      // next < 10 did not have the internal property
      const isInternalRedirect = internal || source === '/:path+/'
      let criteria: string | RouteCriteria | RegExp = this.createRouteCriteria(source, has)

      // Do not add internal redirects if enforceTrailingSlash is disabled
      if (isInternalRedirect && this.edgioConfig?.next?.enforceTrailingSlash === false) continue
      if (isInternalRedirect) {
        // For Next's internal redirects, which either add or remove the trailing slash, depending on the value of the trailingSlash config,
        // we need to ensure that the route matches the entire path or these redirects will cause an infinite loop.

        // These internal redirects don't have valid path-to-regex syntax used by edge-control.
        // That's why we need to convert them to actual regex.
        criteria = new RegExp(pathToRegexp(source))
        destination = bindParams(destination, getBackReferences(source))
      }

      this.router?.match(criteria, ({ redirect, rewritePath, setComment }) => {
        if (isInternalRedirect) setComment("Next's internal redirect")
        redirect(destination, { statusCode: statusCode || 302 })
        // Add empty rewrite to remove any previous rewrites that may have been added.
        rewritePath('/:path*', '/:path*')
      })

      this.logDuringBuild(
        `  ${chalk.blueBright('redirect')}: ${
          typeof criteria === 'object' && !(criteria instanceof RegExp)
            ? JSON.stringify(criteria)
            : criteria?.toString()
        } => ${destination}`
      )
    }
  }

  /**
   * Creates a Edgio RouteCriteria from path and has attributes found in rewrites in redirects
   * in next.config.js.
   * @param path The path pattern
   * @param has Has elements from next.config.js rewrites and redirects.
   * @returns
   */
  protected createRouteCriteria(path: string, has?: any[]): string | RouteCriteria {
    // Next.js adds /:nextInternalLocale(...) at the start of the source route - if we leave this in
    // the actually requests from the browser will never match.
    let criteria: string | RouteCriteria = path.replace(/\/:nextInternalLocale[^/]+/, '')

    if (has) {
      let headers: { [key: string]: RegExp } = {}
      let cookies: { [key: string]: RegExp } = {}
      let query: { [key: string]: RegExp } = {}

      for (let el of has) {
        if (typeof el.value === 'string' && el.value.match(/\(\?<[^>]+>/)) {
          throw new Error(
            'Edgio does not yet support capturing named parameters in `has` elements of `rewrites` or `redirects` in next.config.js.'
          )
        }

        if (el.type === 'header') {
          headers[el.key] = el.value ? new RegExp(el.value) : /.*/
        } else if (el.type === 'host') {
          headers.host = new RegExp(el.value)
        } else if (el.type === 'cookie') {
          cookies[el.key] = el.value ? new RegExp(el.value) : /.*/
        } else if (el.type === 'query') {
          query[el.key] = el.value ? new RegExp(el.value) : /.*/
        } else {
          console.warn(`Warning: has.type ${el.type} is not supported by Edgio`)
        }
      }

      return {
        path: criteria,
        headers: Object.keys(headers).length ? headers : undefined,
        cookies: Object.keys(cookies).length ? cookies : undefined,
        query: Object.keys(query).length ? query : undefined,
      }
    } else {
      return criteria
    }
  }

  /**
   * Adds routes for static assets in /public
   */
  protected addPublicAssets() {
    this.router?.static(join(this.nextRootDir, 'public'), {
      handler: ({ cache, setComment }) => {
        setComment('Serve all assets from public/ folder')
        cache(SHORT_PUBLIC_CACHE_CONFIG)
      },
    })
  }

  /**
   * Adds routes for static assets of /.next/static
   */
  protected addAssets() {
    if (!isCloud()) this.router?.match(this.addBasePath('/_next/webpack-hmr'), this.ssrHandler)

    const staticHandler: FeatureCreator = ({ serveStatic, cache }) => {
      serveStatic(`${this.distDir}/static/:path*`, {
        permanent: true,
      })
      // These files have unique names,
      // so we can cache them for a long time
      cache(FAR_FUTURE_CACHE_CONFIG)
    }
    const handler: FeatureCreator =
      isCloud() || isProductionBuild() ? staticHandler : this.ssrHandler

    // browser js
    // Notes:
    // - Assets with unique hashed filenames like JS, Css, and media are stored
    //   in a persistent bucket to be available across builds
    // - We can't apply that rule to the whole /static folder as it contains
    //   non-unique filenames like 'service-worker.js'. This will
    this.router?.match(this.addBasePath('/_next/static/:path*'), handler)
    this.router?.match(this.addBasePath('/autostatic/:path*'), handler)
  }

  /**
   * Adds routes for correct image optimizer
   * based on used config from edgio.config.js
   */
  protected addImageOptimizer() {
    if (this.edgioConfig?.next?.disableImageOptimizer) {
      this.addNextImageOptimizerRoutes()
      return
    }
    this.addEdgioImageOptimizerRoutes()
  }

  /**
   * Adds routes for edgio image-optimizer when app run in production mode
   */
  protected addEdgioImageOptimizerRoutes() {
    // We replace '/_next/image' the '/__layer0_image_optimizer'
    // so Edgio Buffer Proxy can route to the right lambda in the cloud.
    this.router?.match(
      this.addBasePath('/_next/(image|future/image)'),
      ({ setOrigin, cache, updatePath, setComment }) => {
        setComment('Edgio Image Optimizer')
        cache(PUBLIC_CACHE_CONFIG)
        updatePath(EDGIO_IMAGE_OPTIMIZER_PATH)
        setOrigin(IMAGE_OPTIMIZER_ORIGIN_NAME)
      }
    )
  }

  /**
   * Adds route for next image-optimizer when app run in production mode
   */
  protected addNextImageOptimizerRoutes() {
    // We need to transform relative image paths to absolute to force next/image optimizer in server built to fully work.
    // This route is used when our image optimizer is disabled
    this.router?.match(
      this.addBasePath('/_next/(image|future/image)'),
      ({ proxy, cache, setComment }) => {
        setComment('Next Image Optimizer')
        cache(PUBLIC_CACHE_CONFIG)
        proxy(SERVERLESS_ORIGIN_NAME, {
          transformRequest: req => {
            const protocol = req.secure ? 'https://' : 'http://'

            // The request will be proxied to the same host on local
            // Deployed app will use permalink host from EDGIO_IMAGE_OPTIMIZER_HOST
            const hostname = isLocal()
              ? req.headers['host']
              : process.env.EDGIO_IMAGE_OPTIMIZER_HOST
            const url = new URL(req.url, `${protocol}${hostname}`)
            const imgUrl = url.searchParams.get('url')

            // ignore absolute paths
            if (!imgUrl || imgUrl.startsWith('http')) return

            url.searchParams.set('url', `${protocol}${hostname}${imgUrl}`)
            req.url = `${url.pathname}?${url.searchParams.toString()}`
          },
        })
      }
    )
  }

  /**
   * Adds route with service worker file.
   * This route is used in both production and development modes.
   */
  protected addServiceWorker() {
    if (this.edgioConfig?.next?.disableServiceWorker) return
    this.router?.match(this.addBasePath(`/${SERVICE_WORKER_FILENAME}`), ({ serviceWorker }) => {
      serviceWorker() // We don't provide a path here because the build process puts it in the correct path (s3/service-worker.js)
    })
  }

  /**
   * By default, we send all requests to Next SSR running in serverless.
   * Subsequent static routes will overwrite this and use either edgio_serverless or edgio_serverless_static origins.
   */
  protected addDefaultSSRRoute() {
    this.router?.match('/(.*)', routeHelper => {
      routeHelper.setComment('Send all requests to Next SSR running in serverless by default')
      this.ssrHandler(routeHelper)
    })
  }

  /**
   * The FeatureCreator which proxies all requests to Next in serverless.
   */
  protected ssrHandler: FeatureCreator = (routeHelper: RouteHelper) => {
    // We are requesting a 404 error page by default in serverless mode.
    // This request header is later replaced by the actual page name
    // in addPage() method if it exists.
    if (this.renderMode === RENDER_MODES.serverless) setNextPage('404', routeHelper)

    routeHelper.proxy(SERVERLESS_ORIGIN_NAME, {
      transformRequest: (req: Request) => {
        // Force Next.js server to serve fresh page
        req.setHeader('x-prerender-revalidate', this.manifestParser?.getPreviewModeId() || '')
        if (this.renderMode !== RENDER_MODES.serverless) return
        this.addPageParamsToQuery.bind(this)
      },
      transformResponse: (res: Response, _req: Request) => {
        // If we see Cache-Control: {REMOVE_HEADER_VALUE} here, which is set before the request is handled by prod.ts,
        // we know that the user did not explicitly set a Cache-Control header. This prevents Next.js from
        // adding Cache-Control: private, no-cache, no-store by default, which would disable caching at the edge.
        if (res.getHeader('Cache-Control') !== REMOVE_HEADER_VALUE) return
        res.removeHeader('Cache-Control')
      },
    })
  }

  /**
   * Adds prerendering to pull all SSG pages into the edge cache.
   */
  protected addPrerendering() {
    const requests: PreloadRequest[] = []

    this.pages.forEach(page => {
      // We want to skip SSG pages which are pre-rendered but have dynamic route.
      // Example: /dynamic/ssg/[id]
      if (page?.isDynamic && page?.type === PAGE_TYPES.ssg) return

      page?.prerenderedRoutes?.forEach(prerenderedRoute => {
        const { route, dataRoute } = this.nextPathFormatter.getRouteVariations(prerenderedRoute)
        requests.push({ path: route })
        requests.push({ path: dataRoute })
      })
    })

    this.router?.prerender(requests)
  }

  /**
   * This method is executed before the request is proxied to Next.js in serverless mode.
   * It adds the page params to the query string, so they are correctly parsed under req.params.
   * Without this function the params under context.params would be empty
   * and only available under req.query on SSR pages.
   * @param req
   */
  protected addPageParamsToQuery(req: Request) {
    const pageName = `/${req.getHeaders()[NEXT_PAGE_HEADER] || '404'}`
    const page = this.pagesMap[pageName]
    if (!pageName || !page) return

    // Try to extract params from the path based on provided page route
    const pageRouteParams = new ParamsExtractor({
      path: page.localizedRoute,
    }).extract(req)

    // Try to extract params from the path based on provided page data route
    const pageDataRouteParams = new ParamsExtractor({
      path: page.localizedDataRoute,
    }).extract(req)

    // Override existing query params with same name
    req.query = { ...req.query, ...pageRouteParams, ...pageDataRouteParams }

    let searchParams = qs.stringify(req.query, {
      // Instead of stringifying duplicates as color[0]=red&color[1]=blue
      // we want to preserve duplicate query param names: color=red&color=blue
      // so the params are always parsed as an array by next.
      indices: false,
    })
    req.url = `${req.path}${searchParams.length ? '?' : ''}${searchParams}`
  }

  /**
   * Adds leading basePath property from next.config.js to path
   * in case it's specified
   * @param path
   */
  protected addBasePath(path: string): string {
    if (!this.nextConfig?.basePath) return path
    if (path === '/' && !this.nextConfig.trailingSlash) return this.nextConfig.basePath
    return `${this.nextConfig.basePath}${path}`.replace('//', '/')
  }

  /**
   * Set this option to true to honor Next's internal redirects that either add or remove a trailing slash
   * depending on the value of the `trailingSlash` config. When set to false, these internal redirects are not honored,
   * so sites that fallback to serving from an origin do not add or remove the trailing slash for origin URLs.
   * @param value
   * @deprecated
   */
  setEnforceTrailingSlash(value: boolean) {
    console.warn(
      `[Edgio] ${chalk.yellow(
        "Warning: The 'setEnforceTrailingSlash' method is deprecated. This config option was moved to 'edgio.config.js'."
      )}`
    )
    if (!this.edgioConfig?.next) this.edgioConfig.next = {}
    this.edgioConfig.next.enforceTrailingSlash = value
    return this
  }
}
