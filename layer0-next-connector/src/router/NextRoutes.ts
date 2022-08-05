import { BACKENDS, LAYER0_IMAGE_OPTIMIZER_PATH } from '@layer0/core/constants'
import { isCloud, isProductionBuild } from '@layer0/core/environment'
import { localize, toRouteSyntax } from './nextPathFormatter'
import { existsSync, readFileSync } from 'fs'
import getDistDir from '../util/getDistDir'
import nonWebpackRequire from '@layer0/core/utils/nonWebpackRequire'
import { join } from 'path'
import PluginBase from '@layer0/core/plugins/PluginBase'
import renderNextPage from './renderNextPage'
import Request from '@layer0/core/router/Request'
import ResponseWriter from '@layer0/core/router/ResponseWriter'
import RouteGroup from '@layer0/core/router/RouteGroup'
import Router, { RouteHandler } from '@layer0/core/router/Router'
import { FAR_FUTURE_TTL } from './constants'
import { PreloadRequestConfig } from '@layer0/core/router/Preload'
import watch from '@layer0/core/utils/watch'
import RouteCriteria from '@layer0/core/router/RouteCriteria'
import config from '@layer0/core/config'
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

    this.ssr = (res: ResponseWriter, page: string, _forceRevalidate?: boolean) => {
      return renderNextPage(page, res, params => params, {
        rewritePath: false,
      })
    }

    const { useServerBuild } = getServerBuildAvailability({ config: getNextConfig() })

    if (useServerBuild) {
      this.renderMode = 'server'

      this.ssr = (res: ResponseWriter, _page: string, forceRevalidate?: boolean) => {
        if (forceRevalidate && this.previewModeId) {
          // This needs to be set in order to force Next server to render ISG pages. Without this it will
          // always return the fallback (loading) page
          res.setRequestHeader('x-prerender-revalidate', this.previewModeId)
        }
        return res.renderWithApp()
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
   * Returns the contents of pages-manifest.json
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
    const app = global.LAYER0_NEXT_APP

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
    this.addRedirects(group)
    this.addRewrites(this.rewrites?.beforeFiles, group)
    this.addAssets(group)
    this.addImageOptimizerRoutes(group)
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
  }

  /**
   * Adds the route for server assets such as the middleware manifest
   * @param group
   */
  private addServerAssets(group: RouteGroup) {
    // Note: we don't include /.next/server/pages here because we explicitly copy those over during
    // the build process (see createBuildEntryPoint.ts)
    group.match('/_next/server/:file', ({ serveStatic, cache }) => {
      cache({ edge: { maxAgeSeconds: FAR_FUTURE_TTL } })
      serveStatic(`${this.distDir}/${this.renderMode}/:file`)
    })

    group.match('/_next/server/chunks/:file', ({ serveStatic, cache }) => {
      cache({ edge: { maxAgeSeconds: FAR_FUTURE_TTL } })
      serveStatic(`${this.distDir}/${this.renderMode}/chunks/:file`)
    })
  }

  /**
   * Creates a Layer0 RouteCriteria from path and has attributes found in rewrites in redirects
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
            'Layer0 does not yet support capturing named parameters in `has` elements of `rewrites` or `redirects` in next.config.js.'
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
          console.warn(`Warning: has.type ${el.type} is not supported by Layer0`)
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
          `No matching backend was found in layer0.config.js for rewrite to ${url.toString()}. ` +
            `To fix this problem, add key to the backends config with the following value: { "domainOrIp": "${url.hostname}" }. ` +
            `See https://docs.layer0.co/guides/layer0_config#section_backends for more information.`
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
   * Finds a backend in layer0.config.js that has the same hostname as the specified rewrite destination URL.
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
      for (let { source, has, statusCode, destination } of this.redirects) {
        if (source !== '/:path+/') {
          // We remove the redirect that next.js automatically adds to remove trailing slashes because we already
          // do this in our own serveStatic implementation, and this redirect would prevent the fallback from working
          // because it would match all routes except '/'
          group.match(this.createRouteCriteria(source, has), ({ redirect }) => {
            redirect(destination, { statusCode: statusCode || 302 })
          })
        }
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
        let route = toRouteSyntax(file)

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
      paths: (file: string) => [toRouteSyntax(file)],
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
    const pagesManifest = this.getPagesManifest()

    const pagesWithDataRoutes = new Set<string>(
      routesManifest.dataRoutes.map((route: any) => route.page)
    )

    const addRoute = (label: string, route: string, handler: RouteHandler) => {
      console.debug(`[${label}]`, route)
      group.match(route, handler)
    }

    console.debug('')
    console.debug(`Next.js routes (locales: ${locales?.join(', ') || 'none'})`)
    console.debug('--------------')

    // TODO uncomment this when we support RegExp as route critera
    // this.addMiddlewareInProd(group)

    const pages = sortRoutes(Object.keys(pagesManifest), routesManifest)

    for (let page of pages) {
      const path = toRouteSyntax(page)
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
            `/_next/data/:__build__${localize(
              locales,
              toRouteSyntax(nonLocalizedPath, { suffix: 'json' })
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
          localize(locales, toRouteSyntax(nonLocalizedPath)),
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
            `/_next/data/:__build__${localize(locales, toRouteSyntax(page, { suffix: 'json' }))}`,
            this.createSSRHandler(page)
          )
        }

        // SSR: getServerSideProps or getInitialProps
        addRoute('SSR html', localize(locales, toRouteSyntax(page)), this.createSSRHandler(page))
      }
    }

    console.debug('--------------')
    console.debug('')
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
    const htmlPath = join(this.distDir, this.renderMode, 'pages', `${page}.html`)
    let routeKey = (this.defaultLocale ? `/${this.defaultLocale}` : '') + `${page}`

    if (routeKey !== '/') {
      routeKey = routeKey.replace(/\/$/, '')
    }

    return (
      file.endsWith('.html') ||
      prerenderManifest.routes[routeKey] != null ||
      prerenderManifest.dynamicRoutes[page] != null ||
      existsSync(htmlPath)
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
   * Creates a handler for SSG pages that can be optionally configured with fallback: trlayer0dfdue
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
      destPath = `${assetRoot}${toRouteSyntax(relativeAssetPath)}/index.${suffix}`.replace(
        /\/+/g,
        '/'
      ) // remove duplicate "/"'s
    } else {
      // leave [param] intact because routing will be done on the client
      destPath = `${assetRoot}${slash(relativeAssetPath)}/index.html`
    }

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
   *  import { nextRoutes } from '@layer0/next'
   *  import { Router } from '@layer0/core/router'
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
          'More information: https://docs.layer0.co/guides/next#section_next_js_version_12_and_next_js_middleware__beta_'
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
      group.match('/_next/webpack-hmr', ({ stream }) => stream('__js__'))
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
    group.match('/_next/static/:path*', staticHandler)
    group.match('/autostatic/:path*', staticHandler)
  }

  /**
   * Adds routes for image-optimizer
   * @param group The RouterGroup to which image optimizer routes should be added
   */
  addImageOptimizerRoutes(group: RouteGroup) {
    group.match('/_next/image', ({ proxy }) => {
      // By default '/_next/image' indicates the image is to be optimized.
      // When we are local, we do not need to modify the path as the
      // local framework will, by default, optimize the image for us.
      // But in the cloud we replace '/_next/image' the '/__layer0_image_optimizer'
      // so Layer0 Buffer Proxy can route to the right lambda.
      const production = isProductionBuild()
      const backend = production ? BACKENDS.imageOptimizer : BACKENDS.js
      const opts = production ? { path: LAYER0_IMAGE_OPTIMIZER_PATH } : undefined
      proxy(backend, opts)
    })
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
  // in the routes-manifest.js file. Follow the same order for layer0 routes.
  dynamicRoutes.sort((pageA: string, pageB: string) => {
    return indexFor(pageA) - indexFor(pageB)
  })

  return staticRoutes.concat(dynamicRoutes)
}
