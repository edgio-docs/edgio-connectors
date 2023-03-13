import { BACKENDS, EDGIO_IMAGE_OPTIMIZER_PATH } from '@edgio/core/constants'
import { isCloud, isProductionBuild, isLocal } from '@edgio/core/environment'
import NextPathFormatter from './nextPathFormatter'
import { existsSync, readFileSync } from 'fs'
import getDistDir from '../util/getDistDir'
import nonWebpackRequire from '@edgio/core/utils/nonWebpackRequire'
import { join } from 'path'
import PluginBase from '@edgio/core/plugins/PluginBase'
import renderNextPage from './renderNextPage'
import Request from '@edgio/core/router/Request'
import ResponseWriter from '@edgio/core/router/ResponseWriter'
import RouteGroup from '@edgio/core/router/RouteGroup'
import Router, { RouteHandler } from '@edgio/core/router/Router'
import { FAR_FUTURE_TTL, REMOVE_HEADER_VALUE } from './constants'
import { PreloadRequestConfig } from '@edgio/core/router/Preload'
import watch from '@edgio/core/utils/watch'
import RouteCriteria from '@edgio/core/router/RouteCriteria'
import config from '@edgio/core/config'
import { getServerBuildAvailability } from '../util/getServerBuildAvailability'
import getNextConfig from '../getNextConfig'
import slash from 'slash'

const FAR_FUTURE_CACHE_CONFIG = {
  browser: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
  edge: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
}

const PUBLIC_CACHE_CONFIG = {
  edge: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
}

const TYPE = 'NextRoutes'

export default class NextRoutes extends PluginBase {
  private nextRouteGroupName = 'next_routes_group'
  private nextRootDir: string
  private pagesDir: string
  private pagesDirRelative: string
  private router?: Router
  private rewrites?: any
  private redirects?: any[]
  private locales: string[] = []
  private routesManifest: any
  private distDir: string
  private defaultLocale?: string
  private renderMode: string
  private ssr: (res: ResponseWriter, page: string, forceRevalidate?: boolean) => Promise<void>
  private localizationEnabled: boolean = false
  private buildId: string = 'dev'
  private prerenderManifest: any
  private previewModeId: string | undefined
  private nextConfig: any
  private enforceTrailingSlash: boolean = false
  private queryDuplicatesToArrayOnly: boolean = false
  private nextPathFormatter: NextPathFormatter

  type = TYPE

  /**
   * Provides next registered routes to router
   * @param nextRootDir The root directory for the Next.js app
   */
  constructor(nextRootDir: string = '.') {
    super()
    this.nextRootDir = nextRootDir
    this.pagesDirRelative = 'pages'
    this.pagesDir = join(process.cwd(), this.nextRootDir, this.pagesDirRelative)
    this.distDir = getDistDir()
    this.renderMode = 'serverless'
    this.nextConfig = getNextConfig()
    this.nextPathFormatter = new NextPathFormatter(this.nextConfig)

    this.ssr = (res: ResponseWriter, page: string, _forceRevalidate?: boolean) => {
      return renderNextPage(page, res, params => params, {
        rewritePath: false,
        queryDuplicatesToArrayOnly: this.queryDuplicatesToArrayOnly,
      })
    }

    const { useServerBuild } = getServerBuildAvailability({ config: this.nextConfig })

    if (useServerBuild) {
      this.renderMode = 'server'

      this.ssr = (res: ResponseWriter, _page: string, forceRevalidate?: boolean) => {
        if (forceRevalidate && this.previewModeId) {
          // This needs to be set in order to force Next server to render ISG pages. Without this it will
          // always return the fallback (loading) page
          res.setRequestHeader('x-prerender-revalidate', this.previewModeId)
        }

        return res.proxy(BACKENDS.js, {
          transformResponse(res) {
            // If we see Cache-Control: {REMOVE_HEADER_VALUE} here, which is set before the request is handled by prod.ts,
            // we know that the user did not explicitly set a Cache-Control header. This prevents Next.js from
            // adding Cache-Control: private, no-cache, no-store by default, which would disable caching at the edge unless
            // the user adds forcePrivateCaching: true to their routes. This was the default behavior prior to switching to the
            // Next.js standalone build. We preserve that legacy behavior here to err on the side of caching, which keeps the customer's
            // site fast and costs low.
            if (res.getHeader('Cache-Control') === REMOVE_HEADER_VALUE) {
              res.removeHeader('Cache-Control')
            }
          },
        })
      }
    }

    if (!existsSync(this.pagesDir)) {
      this.pagesDirRelative = join('src', 'pages')
      this.pagesDir = join(process.cwd(), this.nextRootDir, this.pagesDirRelative)
    }

    if (isProductionBuild() || isCloud()) {
      this.routesManifest = this.getRoutesManifest()
      this.buildId = this.getBuildId()
      this.locales = this.routesManifest.i18n?.locales || []
      this.defaultLocale = this.routesManifest.i18n?.defaultLocale
      this.localizationEnabled = this.locales.length > 0
      this.prerenderManifest = this.getPrerenderManifest()
      this.previewModeId = this.prerenderManifest?.preview?.previewModeId
      this.loadRewrites()
    } else {
      this.loadRewritesInDev().then(() => {
        if (this.rewrites || this.redirects) {
          this.updateRoutes()
        }
      })
    }
  }

  /**
   * Set this to true to honor Next's internal redirects that either add or remove a trailing slash
   * depending on the value of the `trailingSlash` config. By default these internal redirects are not
   * honored so that sites that fallback to serving from an origin do not add or remove the trailing slash
   * for origin URLs.
   * @param value
   */
  setEnforceTrailingSlash(value: boolean) {
    this.enforceTrailingSlash = value
    return this
  }

  /**
   * Set to true to parse the duplicate query and next parameters only as an array.
   * When set to false, duplicate query parameters are also parsed as strings with an index in name.
   * This option has no effect on Next apps with Next.js 12 and newer, which are built in server mode.
   *
   * @example true => {"query":{"slug":["value","value2"]}}
   * @example false => {"query":{"slug":["value","value2"],"slug[0]":"value","slug[1]":"value2"}}
   * @default false
   * @param value
   */
  setQueryDuplicatesToArrayOnly(value: boolean) {
    this.queryDuplicatesToArrayOnly = value
    return this
  }

  /**
   * Returns the contents of .next/BUILD_ID
   */
  private getBuildId() {
    const buildIdFile = join(process.cwd(), this.distDir, 'BUILD_ID')
    return readFileSync(buildIdFile, 'utf8')
  }

  /**
   * Returns the contents of routes-manifest.json
   */
  private getRoutesManifest() {
    const routesManifestPath =
      process.env.NEXT_ROUTES_MANIFEST_PATH ||
      join(process.cwd(), this.distDir, 'routes-manifest.json')

    return nonWebpackRequire(routesManifestPath)
  }

  /**
   * Attempt to get rewrites and redirects from routes-manifest.json in production.
   */
  private loadRewrites() {
    const { rewrites, redirects } = this.routesManifest
    this.rewrites = rewrites
    this.redirects = redirects
  }

  /**
   * Returns the contents of pages-manifest.json
   */
  private getPagesManifest() {
    return nonWebpackRequire(
      join(process.cwd(), this.distDir, this.renderMode, 'pages-manifest.json')
    )
  }

  /**
   * Returns the content of app-paths-manifest.json
   * and changes the format of keys to correct URLs
   */
  private getAppPathsManifest() {
    const location = join(process.cwd(), this.distDir, this.renderMode, 'app-paths-manifest.json')
    if (!existsSync(location)) return {}

    const appPaths = nonWebpackRequire(location)
    let appPathsOutput = {}

    // Removes the /page from path
    Object.keys(appPaths).forEach((key: string) => {
      let editedPath = key.substring(0, key.lastIndexOf('/page'))
      editedPath = editedPath.length === 0 ? '/' : editedPath
      appPathsOutput = {
        ...appPathsOutput,
        [editedPath]: appPaths[key],
      }
    })
    return appPathsOutput
  }

  /**
   * Returns the contents of middleware-manifest.json
   */
  private getMiddlewareManifest(): any {
    const path = join(process.cwd(), this.distDir, this.renderMode, 'middleware-manifest.json')

    if (existsSync(path)) {
      return nonWebpackRequire(path)
    } else {
      return {
        sortedMiddleware: [],
        middleware: {},
      }
    }
  }

  /**
   * Returns the contents of prerender-manifest.json
   */
  private getPrerenderManifest() {
    const path = join(process.cwd(), this.distDir, 'prerender-manifest.json')

    try {
      return nonWebpackRequire(path)
    } catch (e) {
      if (process.env.DEBUG === 'true') {
        console.log(`${path} not found`)
      }
      return {}
    }
  }

  /**
   * Attempt to get rewrites and redirects from the next config in development.
   */
  private async loadRewritesInDev() {
    // @ts-ignore
    const app = global.EDGIO_NEXT_APP

    let nextConfig = app.nextConfig

    if (!nextConfig) {
      nextConfig = await app.loadConfig()
    }

    /* istanbul ignore if */
    if (!nextConfig) {
      return
    }

    const rewritesFn = nextConfig.rewrites

    if (rewritesFn) {
      this.rewrites = await rewritesFn()
    }

    const redirectsFn = nextConfig.redirects

    if (redirectsFn) {
      this.redirects = await redirectsFn()
    }
  }

  /**
   * Called when plugin is registered
   * @param router The router to which the plugin has been added.
   */
  onRegister(router: Router) {
    this.router = router
    /* create route group and add all next routes into it */
    this.router.group(this.nextRouteGroupName, group => this.addNextRoutesToGroup(group))
    this.router.fallback(res => this._render404(res))

    if (!isProductionBuild()) {
      watch(this.pagesDir).on('all', () => this.updateRoutes())
    }
  }

  /**
   * Update routes
   */
  private updateRoutes() {
    /* istanbul ignore next */
    const routeGroup = <RouteGroup>(
      this.router?.routeGroups?.findByName(this.nextRouteGroupName)?.clear()
    )
    this.addNextRoutesToGroup(routeGroup)
  }

  /**
   * Adds next routes to route group.
   * @param group The RouteGroup to which Next.js routes should be added.
   */
  private addNextRoutesToGroup(group: RouteGroup) {
    if (isProductionBuild()) {
      console.debug('')
      console.debug(`Next.js routes (locales: ${this.locales?.join(', ') || 'none'})`)
      console.debug('--------------')
    }

    this.addRedirects(group)
    this.addRewrites(this.rewrites?.beforeFiles, group)
    this.addAssets(group)

    const disableImageOptimizer = config.get('disableImageOptimizer', false)
    if (!disableImageOptimizer) {
      this.addEdgioImageOptimizerRoutes(group)
    }
    if (disableImageOptimizer && this.nextConfig.target === 'server') {
      this.addNextImageOptimizerRoutes(group)
    }

    this.addRewrites(this.rewrites?.afterFiles, group)

    if (isProductionBuild()) {
      this.addServerAssets(group)
      this.addPagesInProd(group)
      this.addPrerendering()
    } else {
      this.addPagesInDev(group)
    }

    const fallbackRewrites = this.rewrites?.fallback || this.rewrites

    if (Array.isArray(fallbackRewrites)) {
      this.addRewrites(fallbackRewrites, group)
    }

    if (isProductionBuild()) {
      console.debug('--------------\n')
    }
  }

  /**
   * Adds the route for server assets such as the middleware manifest
   * @param group
   */
  private addServerAssets(group: RouteGroup) {
    // Note: we don't include /.next/server/pages here because we explicitly copy those over during
    // the build process (see createBuildEntryPoint.ts)
    group.match(this.addBasePath('/_next/server/:file'), ({ serveStatic, cache }) => {
      cache({ edge: { maxAgeSeconds: FAR_FUTURE_TTL } })
      serveStatic(`${this.distDir}/${this.renderMode}/:file`)
    })

    group.match(this.addBasePath('/_next/server/chunks/:file'), ({ serveStatic, cache }) => {
      cache({ edge: { maxAgeSeconds: FAR_FUTURE_TTL } })
      serveStatic(`${this.distDir}/${this.renderMode}/chunks/:file`)
    })

    // static assets required by next 13
    const assets = ['app-build-manifest.json', 'build-manifest.json']
    assets.forEach(asset => {
      if (!existsSync(`${this.distDir}/${asset}`)) return
      group.match(this.addBasePath(`/_next/${asset}`), ({ serveStatic, cache }) => {
        cache({ edge: { maxAgeSeconds: FAR_FUTURE_TTL } })
        serveStatic(`${this.distDir}/${asset}`)
      })
    })
  }

  /**
   * Creates a Edgio RouteCriteria from path and has attributes found in rewrites in redirects
   * in next.config.js.
   * @param path The path pattern
   * @param has Has elements from next.config.js rewrites and redirects.
   * @returns
   */
  private createRouteCriteria(path: string, has?: any[]): string | RouteCriteria {
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
   * Find an existing route that would match a request with destination as the path - we will run its handler when
   * the request's path matches the rewrite source.
   * @param group The route group
   * @param source The source URL
   * @param has Any has elements
   * @param destination The destination URL
   */
  private addRewrite(
    group: RouteGroup,
    source: string,
    has: any[] | undefined,
    destination: string
  ) {
    // Next.js adds /:nextInternalLocale at the start of the destination route - if we leave this in
    // we'll never find the destination route
    let normalizedDestination = destination.replace(/\/:nextInternalLocale[^/]*/, '')

    if (this.defaultLocale) {
      // Use the defaultLocale in place of the the :locale parameter since we restrict the locale to only the
      // configured locales. If we don't do this, we'll never find the destination route.
      normalizedDestination = normalizedDestination.replace(/:locale/, this.defaultLocale)
    }

    if (isProductionBuild()) {
      console.debug(`[rewrite] ${source} => ${normalizedDestination}`)
    }

    if (destination.match(/^https?:\/\//)) {
      const url = new URL(destination)
      const backend = this.backendForDestination(url)

      if (backend) {
        // proxy
        group.match(this.createRouteCriteria(source, has), ({ proxy }) => {
          proxy(backend, { path: url.pathname })
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
      group.match(this.createRouteCriteria(source, has), res => {
        const destRoute = group.routes.find(route => {
          return route.match(<Request>{ path: normalizedDestination })
        })

        if (destRoute) {
          // need to extract the params again based on the new path
          res.rewrite(destination, <string>destRoute.criteria.path)
          destRoute.handler(res)
        } else {
          console.warn(`No matching route found for rewrite ${source} => ${destination}`)
        }
      })
    }
  }

  /**
   * Finds a backend in edgio.config.js that has the same hostname as the specified rewrite destination URL.
   * @param urlStr
   * @returns
   */
  private backendForDestination(url: URL) {
    const backends = config.get('backends', {})

    const entry = Object.entries(backends).find(
      ([_key, value]: any[]) => value.domainOrIp === url.hostname
    )

    if (entry) {
      return entry[0]
    }
  }

  private addRewrites(rewrites: any[], group: RouteGroup) {
    if (rewrites) {
      for (let { source, destination, has } of rewrites) {
        this.addRewrite(group, source, has, destination)
      }
    }
  }

  /**
   * Adds rewrites and redirects from next.config.js
   * @param group The group to which to add redirect routes
   */
  private addRedirects(group: RouteGroup) {
    if (this.redirects) {
      for (let { source, has, statusCode, destination, internal } of this.redirects) {
        // next < 10 did not have the internal property
        const isInternalRedirect = internal || source === '/:path+/'

        if (isInternalRedirect && !this.enforceTrailingSlash) {
          continue
        }

        if (isInternalRedirect) {
          // For Next's internal redirects, which either add or remove the trailing slash, depending on the value of the trailingSlash config,
          // we need to ensure that the route matches the entire path or these redirects will cause an infinite loop.
          source += '($)'
        }

        const criteria = this.createRouteCriteria(source, has)

        group.match(criteria, ({ redirect }) => {
          redirect(destination, { statusCode: statusCode || 302 })
        })

        console.log('[redirect]', criteria, 'to', destination)
      }
    }
  }

  /**
   * Adds routes for all pages and corresponding data in development
   * @param group The group to which to add page routes
   */
  private addPagesInDev(group: RouteGroup) {
    const nextHandler = (res: ResponseWriter) => res.proxy(BACKENDS.js)

    // data,
    group.dir(this.pagesDirRelative, {
      ignore: ['_*'],
      paths: (file: string) => {
        let route = this.nextPathFormatter.toRouteSyntax(file)

        if (route.endsWith('/')) {
          route += 'index'
        }

        return [`/_next/data/:build${route}.json`]
      },
      handler: () => nextHandler,
    })

    // SSR,
    group.dir(this.pagesDirRelative, {
      ignore: ['_*'],
      paths: (file: string) => [this.nextPathFormatter.toRouteSyntax(file)],
      handler: () => nextHandler,
    })
  }

  private startsWithLocale(path: string) {
    return this.localizationEnabled && new RegExp(`^/(${this.locales.join('|')})(/|$)`).test(path)
  }

  /**
   * Adds a route for each middleware that forces the edge to send the request to serverless so
   * that middleware runs.
   * @param group
   */
  // TODO uncomment this when we support RegExp as route critera
  // private addMiddlewareInProd(group: RouteGroup) {
  //   const manifest = this.getMiddlewareManifest()
  //
  //   for (let key of manifest.sortedMiddleware) {
  //     const { regexp } = manifest.middleware[key]
  //     group.match(new RegExp(regexp), res => this.ssr(res, '', false))
  //   }
  // }

  /**
   * Adds routes for react components and API handlers
   * @param group The group to which to add page routes
   */
  private addPagesInProd(group: RouteGroup) {
    const { routesManifest, locales, localizationEnabled, prerenderManifest } = this

    const pagesManifest = { ...this.getPagesManifest(), ...this.getAppPathsManifest() }

    const pagesWithDataRoutes = new Set<string>(
      routesManifest.dataRoutes.map((route: any) => route.page)
    )

    const addRoute = (label: string, route: string, handler: RouteHandler) => {
      // Add trailing slash at the end of route when is set trailingSlash to true,
      // route is not root path and neither data path
      if (
        this.nextConfig.trailingSlash &&
        route !== '/' &&
        !/(.*)\/_next\/data\/(.*).json/.test(route)
      ) {
        route += '/'
      }
      route = this.addBasePath(route)
      console.debug(`[${label}]`, route)
      group.match(route, handler)
    }

    // TODO uncomment this when we support RegExp as route critera
    // this.addMiddlewareInProd(group)

    const pages = sortRoutes(Object.keys(pagesManifest), routesManifest)

    for (let page of pages) {
      const path = this.nextPathFormatter.toRouteSyntax(page)
      const isPrerendered = this.isPrerendered(prerenderManifest, pagesManifest, page)

      if (page.match(/\/(_app|_document|_error|404|500)$/)) {
        // skip templates
      } else if (page.startsWith('/api')) {
        // api routes
        addRoute('api', path, res => this.ssr(res, page.slice(1)))
      } else if (this.startsWithLocale(page) && !page.startsWith(`/${this.defaultLocale}`)) {
        // When the app uses internationalization, we collapse all localized routes into a single
        // route to save router spacer, so for example en-US/sale and fr/sale become /:locale(en-US|fr)?/category/sale
      } else if (isPrerendered) {
        // SSG
        const dynamicRouteConfig = prerenderManifest.dynamicRoutes[page]
        const renderType = this.shouldFallbackToSSR(dynamicRouteConfig) ? 'ISG' : 'SSG'
        const nonLocalizedPath = this.startsWithLocale(path) ? this.removeLocale(path) : path
        const nonLocalizedPage = this.startsWithLocale(page) ? this.removeLocale(page) : page

        if (pagesWithDataRoutes.has(page)) {
          // JSON
          addRoute(
            `${renderType} json`,
            `/_next/data/:__build__${this.nextPathFormatter.localize(
              locales,
              this.nextPathFormatter.toRouteSyntax(nonLocalizedPath, { suffix: 'json' })
            )}`,
            this.createSSGHandler(nonLocalizedPage, {
              dataRoute: true,
              localize: localizationEnabled,
              dynamicRouteConfig,
            })
          )
        }

        // HTML
        addRoute(
          `${renderType} html`,
          this.nextPathFormatter.localize(
            locales,
            this.nextPathFormatter.toRouteSyntax(nonLocalizedPath)
          ),
          this.createSSGHandler(nonLocalizedPage, {
            localize: localizationEnabled,
            dynamicRouteConfig,
          })
        )
      } else {
        // SSR
        if (pagesWithDataRoutes.has(page)) {
          // will not get here when the page uses getInitialProps
          addRoute(
            'SSR json',
            `/_next/data/:__build__${this.nextPathFormatter.localize(
              locales,
              this.nextPathFormatter.toRouteSyntax(page, { suffix: 'json' })
            )}`,
            this.createSSRHandler(page)
          )
        }

        // SSR: getServerSideProps or getInitialProps
        addRoute(
          'SSR html',
          this.nextPathFormatter.localize(locales, this.nextPathFormatter.toRouteSyntax(page)),
          this.createSSRHandler(page)
        )
      }
    }
  }

  /**
   * Returns true if the specified page was statically rendered at build time (no getServerSideProps or getInitialProps)
   * @param prerenderManifest The prerender-manifest.json file
   * @param pagesManifest the pages-manifest.json file
   * @param page The page key
   * @returns
   */
  private isPrerendered(prerenderManifest: any, pagesManifest: any, page: string) {
    const file = pagesManifest[page]
    const htmlPagesPath = join(this.distDir, this.renderMode, 'pages', `${page}.html`)
    const htmlAppPath = join(this.distDir, this.renderMode, 'app', `${page}.html`)

    let routeKey = (this.defaultLocale ? `/${this.defaultLocale}` : '') + `${page}`

    if (routeKey !== '/') {
      routeKey = routeKey.replace(/\/$/, '')
    }

    return (
      file.endsWith('.html') ||
      prerenderManifest.routes[routeKey] != null ||
      prerenderManifest.dynamicRoutes[page] != null ||
      existsSync(htmlPagesPath) ||
      existsSync(htmlAppPath)
    )
  }

  /**
   * Removes the locale part from the start of path
   * @param path E.g /en-US/p/[id]
   * @returns the path minus the locale, e.g /p/[id]
   */
  private removeLocale(path: string) {
    const [_, _locale, ...rest] = path.split('/')
    return '/' + rest.join('/')
  }

  /**
   * Automatically configure prerendering to pull all SSG pages into the edge cache.
   * This only needs to be done during a production build.
   */
  private addPrerendering() {
    const { routes } = this.prerenderManifest
    const requests: PreloadRequestConfig[] = []

    for (let htmlPath in routes) {
      requests.push({ path: htmlPath })
      requests.push({ path: `/_next/data/${this.buildId}${htmlPath}.json` })
    }

    const router = <Router>this.router
    router.prerender(requests)
  }

  /**
   * Production route handler for all dynamic HTML and JSON requests (SSR and SSG).
   * @param page The next.js page to render
   */
  private createSSRHandler(page: string) {
    // Note, we do not need to look up revalidate times from prerender-manifest.json
    // because Next automatically set cache-control: s-maxage=(revalidate), stale-while-revalidate
    return (res: ResponseWriter) => this.ssr(res, page.slice(1))
  }

  /**
   * Returns true if a page with getStaticProps is configured to fallback to SSR
   * Specifically, this function returns true if dynamicRouteConfig.fallback is null (fallback: 'blocking') or a string (fallback: true)
   * @param dynamicRouteConfig
   * @returns
   */
  private shouldFallbackToSSR(dynamicRouteConfig?: any) {
    if (dynamicRouteConfig) {
      return (
        dynamicRouteConfig.fallback === null /* fallback: 'blocking' */ ||
        typeof dynamicRouteConfig.fallback === 'string' /* fallback: true */
      )
    } else {
      return false
    }
  }

  /**
   * Creates a handler for SSG pages that can be optionally configured with fallback: tredgiodfdue
   * @param relativeAssetPath The asset path relative to .next/serverless
   * @param options
   */
  private createSSGHandler(
    relativeAssetPath: string,
    {
      dataRoute,
      localize,
      dynamicRouteConfig,
    }: {
      dataRoute?: boolean
      localize?: boolean
      dynamicRouteConfig?: any
    }
  ) {
    const suffix = dataRoute ? 'json' : 'html'
    const assetRoot = `${this.distDir}/${this.renderMode}/pages${localize ? '/:locale' : ''}`
    const { prerenderManifest } = this

    let destPath: string

    if (dynamicRouteConfig || dataRoute) {
      // convert [param] to :param so that we can find the corresponding file on S3
      destPath = `${assetRoot}${this.nextPathFormatter.toRouteSyntax(
        relativeAssetPath
      )}/index.${suffix}`
    } else {
      // leave [param] intact because routing will be done on the client
      destPath = `${assetRoot}${slash(relativeAssetPath)}/index.html`
    }

    destPath = destPath.replace(/\/+/g, '/') // remove duplicate "/"'s

    return (res: ResponseWriter) => {
      if (dynamicRouteConfig) {
        // will get here if the page has route params
        let loadingPage: string | undefined = undefined
        const { fallback } = dynamicRouteConfig

        if (!dataRoute && fallback) {
          loadingPage = `${assetRoot}${fallback}`.replace(/\.html$/, '/index.html')
        }

        // Note that the cache TTL is stored as a header on S3 based on the prerender-manifest.json,
        // so we don't need to use res.cache() here.

        res.serveStatic(destPath, {
          loadingPage,
          disableAutoPublish: true,
          onNotFound: () => {
            const isPrerendered = prerenderManifest.routes[res.request.path]

            // Note that fallback: 'blocking' in getStaticPaths results in fallback: null in prerender-manifest.json
            if (this.shouldFallbackToSSR(dynamicRouteConfig) || isPrerendered || dataRoute) {
              // Fallback to SSR when fallback: true is set in getStaticPaths or when revalidating a prerendered page or when it's a data path
              return this.ssr(res, relativeAssetPath, true)
            } else {
              // Render the custom 404 when a static page is not found.
              return this._render404(res)
            }
          },
        })
      } else {
        // will get here if the page does not have route params
        res.serveStatic(destPath, {
          disableAutoPublish: true,
          onNotFound: () => this.ssr(res, relativeAssetPath, true),
        })
      }
    }
  }

  /**
   * Renders the the 404 page.
   *
   * Example:
   *
   * ```js
   *  import { nextRoutes } from '@edgio/next'
   *  import { Router } from '@edgio/core/router'
   *
   *  export default new Router()
   *    .get('/some/missing/page', (res) => {
   *      nextRoutes.render404(res)
   *    })
   *    .use(nextRoutes)
   * ```
   *
   * @param res The ResponseWriter to use to send the response
   */
  async render404(res: ResponseWriter) {
    // This method is retired for use with a server build. _render404 kept for internal use and backwards
    // compatibility with older versions using this method.
    /* istanbul ignore if */
    if (this.renderMode === 'server') {
      throw new Error(
        'The use of `NextRoutes.render404` is retired for use with a server target build.\n' +
          'More information: https://docs.edg.io/guides/next#section_next_js_version_12_and_next_js_middleware__beta_'
      )
    } else {
      await this._render404(res)
    }
  }

  private async _render404(res: ResponseWriter) {
    if (isCloud()) {
      const locale = res.request.params?.locale

      let prefix = ''

      if (locale) {
        prefix = `/${locale}`
      } else if (this.defaultLocale) {
        prefix = `/${this.defaultLocale}`
      }

      const pagesManifest = this.getPagesManifest()

      const key = `${prefix}/404`
      const notFoundPage = pagesManifest[key]
      const assetRoot = `${this.distDir}/${this.renderMode}/pages`

      if (notFoundPage && notFoundPage.endsWith('.html')) {
        // static 404
        await res.serveStatic(`${assetRoot}${key}/index.html`, {
          statusCode: 404,
          statusMessage: 'Not Found',
        })
      } else {
        // dynamic 404
        res.response.statusCode = 404
        res.response.statusMessage = 'Not Found'
        await this.ssr(res, '404')
      }
    } else {
      return this.ssr(res, '404')
    }
  }

  /**
   * Adds routes for static assets, including /public and /.next/static
   * @param group The RouterGroup to which asset routes should be added
   */
  private addAssets(group: RouteGroup) {
    // public assets
    group.static(join(this.nextRootDir, 'public'), {
      handler: (file: string) => (res: ResponseWriter) => res.cache(PUBLIC_CACHE_CONFIG),
    })

    // webpack hot loader
    if (!isCloud()) {
      group.match(this.addBasePath('/_next/webpack-hmr'), ({ stream }) => stream('__js__'))
    }

    const staticHandler: RouteHandler = ({ proxy, serveStatic, cache }) => {
      if (isCloud() || isProductionBuild()) {
        cache(FAR_FUTURE_CACHE_CONFIG)
        serveStatic(`${this.distDir}/static/:path*`, {
          permanent: true,
          exclude: [join(this.distDir, 'static', 'service-worker.js')],
        })
      } else {
        proxy(BACKENDS.js)
      }
    }

    // browser js
    // Notes:
    // - Assets with unique hashed filenames like JS, Css, and media are stored
    //   in a persistent bucket to be available across builds
    // - We can't apply that rule to the whole /static folder as it contains
    //   non-unique filenames like 'service-worker.js'. This will
    group.match(this.addBasePath('/_next/static/:path*'), staticHandler)
    group.match(this.addBasePath('/autostatic/:path*'), staticHandler)
  }

  /**
   * Adds routes for edgio image-optimizer when app run in production mode
   * @param group The RouterGroup to which image optimizer routes should be added
   */
  addEdgioImageOptimizerRoutes(group: RouteGroup) {
    // Add route to exclude svg images from image optimization
    group.match(
      {
        path: this.addBasePath('/_next/image'),
        method: /GET/i,
        query: { url: /\.svg/ },
      },
      ({ proxy }) => {
        if (!isProductionBuild()) return
        // Due to way how older next versions are serving SVG files
        // we need to tell optimizer to exclude all svg files to prevent converting them to WEBP
        proxy(BACKENDS.imageOptimizer, { path: `${EDGIO_IMAGE_OPTIMIZER_PATH}?u=true` })
      }
    )

    // We replace '/_next/image' the '/__edgio_image_optimizer'
    // so Edgio Buffer Proxy can route to the right lambda in the cloud.
    group.match(this.addBasePath('/_next/(image|future/image)'), ({ proxy }) => {
      if (!isProductionBuild()) return
      proxy(BACKENDS.imageOptimizer, { path: EDGIO_IMAGE_OPTIMIZER_PATH })
    })
  }

  /**
   * Adds route for next image-optimizer when app run in production mode
   * @param group The RouterGroup to which routes should be added
   */
  addNextImageOptimizerRoutes(group: RouteGroup) {
    // We need to transform relative image paths to absolute to force next/image optimizer in server built to fully work.
    // This route is used when our image optimizer is disabled
    group.match(this.addBasePath('/_next/(image|future/image)'), ({ proxy }) => {
      if (!isProductionBuild()) return
      proxy(BACKENDS.js, {
        transformRequest: req => {
          const protocol = req.secure ? 'https://' : 'http://'

          // The request will be proxied to the same host on local
          // Deployed app will use permalink host from EDGIO_IMAGE_OPTIMIZER_HOST
          const hostname = isLocal() ? req.headers['host'] : process.env.EDGIO_IMAGE_OPTIMIZER_HOST
          const url = new URL(req.url, `${protocol}${hostname}`)
          const imgUrl = url.searchParams.get('url')

          // ignore absolute paths
          if (!imgUrl || imgUrl.startsWith('http')) return

          url.searchParams.set('url', `${protocol}${hostname}${imgUrl}`)
          req.url = `${url.pathname}?${url.searchParams.toString()}`
        },
      })
    })
  }

  /**
   * Adds leading basePath property from next.config.js to path
   * in case it's specified
   * @param path
   */
  addBasePath(path: string): string {
    if (!this.nextConfig.basePath) return path
    if (path === '/' && !this.nextConfig.trailingSlash) return this.nextConfig.basePath
    return `${this.nextConfig.basePath}${path}`.replace('//', '/')
  }
}

/**
 * Sort static routes before dynamic routes
 * @param pages Page paths
 * @param routesManifest The routes manifest generated by Next's build
 */
export function sortRoutes(pages: string[], routesManifest: any): string[] {
  const isDynamic = (page: string) => routesManifest.dynamicRoutes.find((r: any) => r.page === page)
  const indexFor = (page: string) =>
    routesManifest.dynamicRoutes.findIndex((r: any) => r.page === page)

  let staticRoutes = [],
    dynamicRoutes = []

  for (let page of pages) {
    if (isDynamic(page)) {
      dynamicRoutes.push(page)
    } else {
      staticRoutes.push(page)
    }
  }

  // Dynamic routes are ordered by priority (least dynamic to most dynamic)
  // in the routes-manifest.js file. Follow the same order for edgio routes.
  dynamicRoutes.sort((pageA: string, pageB: string) => {
    return indexFor(pageA) - indexFor(pageB)
  })

  return staticRoutes.concat(dynamicRoutes)
}
