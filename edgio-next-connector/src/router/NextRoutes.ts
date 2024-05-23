import { isCloud, isLocal, isProductionBuild } from '@edgio/core/environment'
import NextPathFormatter from './nextPathFormatter'
import { getDistDirFromConfig } from '../util/getDistDir'
import { join } from 'path'
import { RouterPlugin } from '@edgio/core/router/Router'
import Router from '@edgio/core/router/Router'
import RouteCriteria, { and, or } from '@edgio/core/router/RouteCriteria'
import { getConfig } from '@edgio/core/config'
import getNextConfig from '../getNextConfig'
import RouteHelper, { FeatureCreator } from '@edgio/core/router/RouteHelper'
import { SERVERLESS_ORIGIN_NAME } from '@edgio/core/origins'
import {
  FAR_FUTURE_CACHE_CONFIG,
  PUBLIC_CACHE_CONFIG,
  SHORT_PUBLIC_CACHE_CONFIG,
} from './cacheConfig'
import ManifestParser from './ManifestParser'
import {
  EDGIO_IMAGE_PROXY_PATH,
  NEXT_PAGE_HEADER,
  NEXT_PRERENDERED_PAGES_FOLDER,
  SERVICE_WORKER_FILENAME,
} from '../constants'
import chalk from 'chalk'
import { edgioRoutes, HTTP_HEADERS } from '@edgio/core'
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
import getBuildId from '../util/getBuildId'
import { PreloadRequest } from '@edgio/core/router/Preload'
import bindParams from '@edgio/core/utils/bindParams'
import { getBackReferences } from '@edgio/core/router/path'
import { pathToRegexp } from 'path-to-regexp'
import toEdgeRegex from '@edgio/core/utils/toEdgeRegex'
import getNextRootDir from '../util/getNextRootDir'
import isValidRemotePattern from '../util/isValidRemotePattern'
import { Middleware, NextConfig, Redirect } from '../next.types'
import { HttpStatusCode } from '@edgio/core/types'

export default class NextRoutes implements RouterPlugin {
  protected router?: Router
  protected nextRootDir: string
  protected defaultLocale?: string
  protected locales: string[] = []
  protected redirects: Redirect[] = []
  protected pages: Page[] = []
  protected pagesMap: { [key: string]: Page } = {}
  protected middlewares: Middleware[] = []
  protected distDir: string
  protected buildId: string = 'dev'
  protected previewModeId: string | undefined
  protected nextConfig: NextConfig
  protected edgioConfig: ExtendedConfig
  protected nextPathFormatter: NextPathFormatter
  protected manifestParser: ManifestParser
  protected renderMode: RenderMode

  /**
   * Provides next registered routes to router
   * @param nextRootDir The root directory for the Next.js app
   */
  constructor(nextRootDir?: string) {
    this.nextRootDir = nextRootDir ?? getNextRootDir()
    this.edgioConfig = getConfig() as ExtendedConfig
    this.nextConfig = getNextConfig(this.nextRootDir)
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
    this.locales = this.manifestParser.getLocales()
    this.defaultLocale = this.manifestParser.getDefaultLocale()
    this.middlewares = this.manifestParser.getMiddlewares()

    // Production mode
    if (isProductionBuild() || isCloud()) {
      this.buildId = getBuildId(join(this.nextRootDir, this.distDir))
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
    this.logPages()
    if (this.edgioConfig?.next?.proxyToServerlessByDefault !== false) {
      this.addDefaultSSRRoute()
    }
    this.addPages()
    this.add404ErrorPages()
    this.addPrerenderedPages()
    this.addPublicAssets()
    this.addAssets()
    this.addImageOptimizerRoutes()
    this.addRedirects()
    this.addServiceWorker()
    this.addPrerendering()
    this.logDuringBuild('')
    this.addImageOptimization()

    this.router.use(edgioRoutes)
  }

  /**
   * Adds rules for pre-rendered pages
   */
  protected addPrerenderedPages() {
    let routes: string[] = []
    let dataRoutes: string[] = []

    this.pages.forEach(page =>
      page?.prerenderedRoutes?.forEach(
        ({ nextRoute, route, dataRoute, initialRevalidateSeconds }) => {
          // Apply modifiers to route and data route
          nextRoute = this.addBasePath(nextRoute)
          route = this.addBasePath(route)
          dataRoute = this.addBasePath(dataRoute ?? '')

          // To reduce the number of generated rules, we will not use XBP for updating prerendered pages with revalidation on S3.
          // Instead, we will let Next.js handle them and return the stale-while-revalidate cache-control header with revalidation time.
          // These pages are then cached by the Edge for the specified time.
          // The only difference between these two approaches is in the first request or when page is fetching external data and it fails.
          // To achieve this, we will exclude these pages with revalidation from the rule with prerendered pages.
          if (page.hasRevalidation) return

          // When page is dynamic with params and has no data route,
          // we need to create a separate dynamic route because the IN operator can't be used with dynamic routes.
          // Example: /en-US/ssg/[id] => Path: /en-US/ssg/:id, Asset: /en-US/ssg/[id]/index.html
          if (page?.isDynamic && !page?.dataRoute) {
            const routeAsset = `${NEXT_PRERENDERED_PAGES_FOLDER}${nextRoute}/index.html`

            // We need to match both methods and path, because next 14 introduces server actions
            // where on the same static path is server action sent but with different method (POST, PUT, DELETE, etc.)
            this.router?.if(
              or({ method: 'get' }, { method: 'head' }),
              ({ setComment }) => {
                setComment('Serve pre-rendered page with dynamic route and no getStaticPaths')
              },
              new Router().match({ path: route }, ({ serveStatic, cache }) => {
                serveStatic(routeAsset)
                cache(PUBLIC_CACHE_CONFIG)
              })
            )

            // Create separate rule

            // No need to add data route, so we're done
            return
          }

          // Add to single rule
          routes.push(route)
          if (dataRoute) dataRoutes.push(dataRoute)
        }
      )
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
    this.router?.if(
      or({ method: 'get' }, { method: 'head' }),
      ({ setComment }) => setComment('Serve all pre-rendered HTML pages (getStaticPaths)'),
      new Router().match({ path: routes }, ({ serveStatic, setResponseCode, cache }) => {
        serveStatic(`${NEXT_PRERENDERED_PAGES_FOLDER}/:path*/index.html`)
        setResponseCode(200)
        cache(PUBLIC_CACHE_CONFIG)
      })
    )

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
   * Adds rules with handler for all SSR, ISG, ISR pages
   */
  protected addPages() {
    this.pages.forEach(page => {
      // Skip pages which are pure SSG (addPrerenderedPages will handle them)
      if (page.type === PAGE_TYPES.ssg && !page.hasRevalidation) return

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

      // This ensures that we will have all features for one route in one rule
      // instead of having multiple rules for one route.
      // Add rule with all route handlers for route.
      if (routeHandlers.length > 0) {
        this.router?.match(this.addBasePath(page.localizedRoute), routeHelper => {
          routeHandlers.forEach(handler => handler(routeHelper))
        })
      }

      // Add rule with all route handlers for data route.
      if (dataRouteHandlers.length > 0 && page?.localizedDataRoute) {
        this.router?.match(this.addBasePath(page.localizedDataRoute), routeHelper => {
          dataRouteHandlers.forEach(handler => handler(routeHelper))
        })
      }
    })
  }

  /**
   * Adds rules which serves static HTML 404 error page
   * for all not prerendered routes which has fallback: false.
   */
  protected add404ErrorPages() {
    this.pages.forEach(page => {
      // We will add 404 error page just for pages with fallback: false
      if (page?.fallback !== FALLBACK_TYPES.false) return

      const assetPath =
        NEXT_PRERENDERED_PAGES_FOLDER +
        this.addBasePath(`/${this.locales.length > 0 ? ':locale/' : ''}`)

      // Because the rules are overlapping and the features of matched rules are then merged together,
      // we need to exclude all pre-rendered routes from the 404 error page rule with dynamic path.
      this.router?.if(
        and(
          {
            path: this.addBasePath(page.localizedRoute),
          },
          {
            path: {
              not:
                page.prerenderedRoutes
                  ?.map(({ route }) => this.addBasePath(route))
                  ?.flatMap(route => (route === '/' ? [route] : [route, `${route}/`])) ?? [],
            },
          }
        ),
        ({ setComment, serveStatic, cache, setResponseCode }) => {
          // Serve static 404 error page for all not pre-rendered routes.
          setComment('Serve 404 for HTML paths not returned by getStaticPaths (fallback: false)')
          serveStatic(`${assetPath}/404/index.html`.replace(/\/+/g, '/'), {
            rewritePathSource: this.addBasePath(page.localizedRoute),
          })
          // Overrides default cache config from serveStatic
          cache({
            ...PUBLIC_CACHE_CONFIG,
            cacheableStatusCodes: [404],
          })
          setResponseCode(404)
        }
      )

      // We're done if there is no data route
      if (!page?.localizedDataRoute) return

      this.router?.if(
        and(
          {
            path: this.addBasePath(page.localizedDataRoute),
          },
          {
            path: {
              not:
                page.prerenderedRoutes?.map(({ dataRoute }) => this.addBasePath(dataRoute ?? '')) ??
                [],
            },
          }
        ),
        ({ setComment, setResponseCode }) => {
          // We want to serve HTML error page even for not prerendered data route
          setComment('Serve 404 for JSON paths not returned by getStaticPaths (fallback: false)')
          setResponseCode(404)
        }
      )
    })
  }

  /**
   * Logs provided route with label and other params
   * to the console during the build.
   * @param page
   * @param route
   * @param label
   * @param initialRevalidateSeconds
   * @returns
   */
  logRoute(page: Page, route: string, label: string, initialRevalidateSeconds?: number | boolean) {
    const parameters = []

    if (page.fallback) {
      parameters.push(chalk.grey(`${page.fallback}`))
    }

    initialRevalidateSeconds =
      initialRevalidateSeconds || page?.prerenderedRoutes?.[0]?.initialRevalidateSeconds
    if (initialRevalidateSeconds) {
      parameters.push(chalk.grey(`revalidate: ${initialRevalidateSeconds}`))
    }

    const type = `${page.type}${label ? ' ' + label : ''}`
    const params = parameters.length > 0 ? chalk.grey(` (${parameters.join(', ')})`) : ''

    this.logDuringBuild(`  ${chalk.blueBright(type)}${params}: ${route}`)
  }

  /**
   * Logs a pages with their data routes
   * and prerendered routes to the console during the build.
   * @returns
   */
  logPages() {
    this.pages.forEach(page => {
      // Skip SSG pages from logging here to not log them twice.
      // They are logged as prerendered routes.
      if (page.type !== PAGE_TYPES.ssg) {
        // Log route of page without data route
        if (!page.dataRoute || !page.localizedDataRoute)
          return this.logRoute(page, this.addBasePath(page.localizedRoute), '')

        // Log routes of page with data route
        this.logRoute(page, this.addBasePath(page.localizedRoute), 'html')
        this.logRoute(page, this.addBasePath(page.localizedDataRoute), 'json')
      }

      // Log prerendered routes of page
      page.prerenderedRoutes?.forEach(({ route, dataRoute, initialRevalidateSeconds }) => {
        this.logRoute(page, this.addBasePath(route), 'html', initialRevalidateSeconds)
        if (dataRoute)
          this.logRoute(page, this.addBasePath(dataRoute), 'json', initialRevalidateSeconds)
      })
    })
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
   * Adds redirects from next.config.js
   */
  protected addRedirects() {
    if (!this.redirects) return

    for (let { source, has, statusCode, destination, internal, locale } of this.redirects) {
      if (this.defaultLocale && locale !== false) {
        // Next.js server is performing redirect for paths with and without default locale.
        // We adjust redirects which start with default locale here, to make sure that they are working the same way.
        source = source.replace(
          `/${this.defaultLocale}/`,
          `/:nextInternalLocale(${this.defaultLocale})?/`
        )
      }

      // next < 10 did not have the internal property
      const isInternalRedirect = internal || source === '/:path+/'
      let criteria: string | RouteCriteria | RegExp = this.createRouteCriteria(source, has)
      statusCode = statusCode || 302

      // Do not add internal redirects if enforceTrailingSlash is disabled
      if (isInternalRedirect && this.edgioConfig?.next?.enforceTrailingSlash === false) continue
      this.router?.match(
        criteria,
        ({ setComment, setResponseCode, addFeatures, rewritePath, redirect }) => {
          if (isInternalRedirect) {
            // For Next's internal redirects, which either add or remove the trailing slash, depending on the value of the trailingSlash config,
            // we need to ensure that the route matches the entire path or these redirects will cause an infinite loop.

            // These internal redirects don't have valid path-to-regex syntax used by edge-control.
            // That's why we need to convert them to actual regex.
            setComment("Next's internal redirect")
            addFeatures({
              url: {
                url_redirect: {
                  code: statusCode as HttpStatusCode,
                  syntax: 'regexp',
                  source: toEdgeRegex(new RegExp(pathToRegexp(source))),
                  destination: bindParams(destination, getBackReferences(source)),
                },
              },
            })
            // We need to add this empty rewrite to delete any previous rewrites.
            // Otherwise, the redirect will not match the URL.
            rewritePath('/:path*', '/:path*')
          } else {
            redirect(destination, { statusCode: statusCode })
          }
          setResponseCode(statusCode as HttpStatusCode)
        }
      )

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
    if (has) {
      let headers: { [key: string]: RegExp } = {}
      let cookies: { [key: string]: RegExp } = {}
      let query: { [key: string]: RegExp } = {}

      for (let el of has) {
        if (typeof el.value === 'string' && el.value.match(/\(\?<[^>]+>/)) {
          throw new Error(
            'Edgio does not yet support capturing named parameters in `has` elements of `redirects` in next.config.js.'
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
        path,
        headers: Object.keys(headers).length ? headers : undefined,
        cookies: Object.keys(cookies).length ? cookies : undefined,
        query: Object.keys(query).length ? query : undefined,
      }
    } else {
      return path
    }
  }

  /**
   * Adds routes for static assets in /public
   */
  protected addPublicAssets() {
    this.router?.static('public', {
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
   * This is quick fix for bug in Sailfish, as it removes encoding-type when image optimization is enabled.
   * With this fix the image optimization will reamin the same but as we are setting the rule only for images
   * it won't affect other static files (like fonts, css, json, etc.)
   */
  protected addImageOptimization() {
    this.router?.match(
      /\.(jpg|jpeg|pjpg|pjpeg|png|ppng|gif|bmp|webp|ico|tif|tiff|jfif|jp2|j2k|jpf|jpx|jpm|mj2|xbm|wbmp)$/,
      ({ optimizeImages, setComment }) => {
        setComment('Generic image optimization rule for all image types.')
        optimizeImages(true)
      }
    )
  }

  /**
   * Adds routes for Image Optimizer:
   * - Edgio Image Proxy
   * - Next Image Optimizer
   */
  protected addImageOptimizerRoutes() {
    // We also need to add rule for Next's image-optimizer
    // when app is running in development mode
    // just for case when proxyToServerlessByDefault is false.
    if (this.edgioConfig?.next?.disableImageOptimizer || !isProductionBuild()) {
      this.addNextImageOptimizerRoutes()
    }
    if (!this.edgioConfig?.next?.disableImageOptimizer) {
      this.addEdgioImageProxyRoutes()
    }
  }

  /**
   * Adds route for next image-optimizer when app run in production mode
   */
  protected addNextImageOptimizerRoutes() {
    // We need to transform relative image paths to absolute to force next/image optimizer in server built to fully work
    // because images are not on local file system but on S3.
    // This route is used when our sailfish's image optimizer is disabled
    // or when user wants to optimize images on remote hosts.
    this.router?.match(
      this.addBasePath('/_next/(image|future/image)'),
      ({ proxy, cache, setComment }) => {
        setComment('Next Image Optimizer')
        cache(SHORT_PUBLIC_CACHE_CONFIG)
        proxy(SERVERLESS_ORIGIN_NAME, {
          transformRequest: req => {
            const protocol = req.secure ? 'https://' : 'http://'
            // The request will be proxied to the same host on local
            // Deployed app will use permalink host from EDGIO_PERMALINK_HOST env variable
            const hostname =
              process.env.EDGIO_PERMALINK_HOST ||
              process.env.EDGIO_IMAGE_OPTIMIZER_HOST ||
              req.headers.host
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
   * Adds route that will proxy images from remote hosts,
   * so they can be later optimized by Sailfish's image-optimizer,
   * and cached on the edge. This approach works even with old serverless builds
   * without Next's image-optimizer. This rule is used by our imageLoader.
   */
  protected addEdgioImageProxyRoutes() {
    this.router?.match(EDGIO_IMAGE_PROXY_PATH, ({ compute, cache, setComment, optimizeImages }) => {
      setComment('Edgio Image Proxy - Proxies images from remote hosts')
      cache(SHORT_PUBLIC_CACHE_CONFIG)
      optimizeImages(true)
      compute(async (req, res) => {
        try {
          const url = new URL(req.url, `http://${req.headers['host']}`)
          const imgUrl = url.searchParams.get('url')

          if (!imgUrl || !isValidRemotePattern(this.nextConfig, imgUrl)) {
            res.statusCode = 400
            res.statusMessage = 'Bad Request'
            res.body = `ERROR: The provided URL is not defined in 'next.config.js' under 'images.remotePatterns' or 'images.domains'.`
            if (isLocal()) {
              console.error(
                `[Edgio] Image Proxy ERROR: The provided URL is not allowed.\r\n` +
                  `Please add the URL to 'next.config.js' under 'images.remotePatterns' or 'images.domains'.\r\n` +
                  `See https://nextjs.org/docs/pages/api-reference/components/image#remotepatterns for more details.\r\n` +
                  `URL: ${imgUrl}\r\n`
              )
            }
            return
          }

          // Standard fetch func is returning arrayBuffer,
          // so we need to convert it to Buffer from Node.js here.
          const remoteRes = await fetch(imgUrl)
          const bufferedBody = Buffer.from(await remoteRes.arrayBuffer())

          // Allow to proxy only images.
          // We have localhost and 127.0.0.1 in allowed domains by default,
          // and this would allow to expose potentially sensitive data from customer's app.
          const contentType = remoteRes.headers.get(HTTP_HEADERS.contentType)
          if (!contentType?.startsWith('image')) {
            res.statusCode = 400
            res.body = `ERROR: The requested asset on given URL is not an image.`
            console.error(
              `[Edgio] Image Proxy ERROR: The requested asset on given URL is not an image.`
            )
            return
          }

          // Copy required headers from the remote response to the response
          // NOTE: Do not content-encoding header, because the response is already encoded
          // by @edgio/core with brotli or gzip, and it sets the correct content-encoding header.
          remoteRes.headers.forEach((value, name) => {
            if (
              ![HTTP_HEADERS.contentLength as string, HTTP_HEADERS.contentType as string].includes(
                name.toLowerCase()
              )
            )
              return
            res.setHeader(name, value)
          })

          res.write(bufferedBody)
          res.end()
        } catch (e: any) {
          res.statusCode = 500
          res.body = `ERROR: Couldn't fetch the image from the provided URL.`
          console.error(`[Edgio] Image Proxy ERROR: ${e.message}`)
        }
      })
    })
  }

  /**
   * Adds route with service worker file.
   * This route is used in both production and development modes.
   */
  protected addServiceWorker() {
    if (this.edgioConfig?.next?.disableServiceWorker) return
    this.router?.match(`/${SERVICE_WORKER_FILENAME}`, ({ serviceWorker }) => {
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

    // Special case for 404 error page with revalidation.
    // If 404 page has revalidation, we'll cache it on the edge for time specified in cache-control header returned by Next.js
    // unless cache-control header is set to private, no-cache or no-store.
    // @example cache-control: s-maxage=10, stale-while-revalidate
    if (this.pagesMap['/404']?.hasRevalidation) {
      routeHelper.cache({
        cacheableStatusCodes: [404],
      })
    }

    routeHelper.proxy(SERVERLESS_ORIGIN_NAME, {
      transformRequest: (req: Request) => {
        if (this.renderMode === RENDER_MODES.serverless) this.addPageParamsToQuery(req)

        // Test if any middleware matches the request path
        // NOTE: We can also loop through pages and match those that have revalidation
        // and exclude them, but it's faster to loop through middlewares as there are fewer of them
        // most of the time.
        const matchedMiddleware = this.middlewares.find(middleware =>
          middleware.matchers.some(matcher => new RegExp(matcher.regexp).test(req.path))
        )

        // Force Next.js server to serve fresh page if any middleware isn't matched for this req.
        // The 'x-prerender-revalidate' header is needed for ISG/ISR pages with revalidation when page is requested by the Edge,
        // so Next.js knows it shouldn't serve page from disk or cache.
        // Disadvantage is that if this header is present, Next.js server doesn't run the middlewares.
        if (!matchedMiddleware) {
          req.setHeader('x-prerender-revalidate', this.manifestParser?.getPreviewModeId() || '')
        }
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

      page?.prerenderedRoutes?.forEach(({ route, dataRoute }) => {
        requests.push({ path: this.addBasePath(route) })
        if (dataRoute) requests.push({ path: this.addBasePath(dataRoute) })
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
