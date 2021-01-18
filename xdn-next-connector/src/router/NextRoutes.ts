import { BACKENDS, XDN_IMAGE_OPTIMIZER_PATH } from '@xdn/core/constants'
import { isCloud, isProductionBuild } from '@xdn/core/environment'
import { localize, toRouteSyntax } from './nextPathFormatter'
import { watch, existsSync } from 'fs'
import get from 'lodash/get'
import getDistDir from '../util/getDistDir'
import nonWebpackRequire from '@xdn/core/utils/nonWebpackRequire'
import { join } from 'path'
import PluginBase from '@xdn/core/plugins/PluginBase'
import render from './renderNextPage'
import Request from '@xdn/core/router/Request'
import ResponseWriter from '@xdn/core/router/ResponseWriter'
import RouteGroup from '@xdn/core/router/RouteGroup'
import Router, { RouteHandler } from '@xdn/core/router/Router'
import { FAR_FUTURE_TTL } from './constants'
import { PreloadRequestConfig } from '@xdn/core/router/Preload'
import { getSourceDir } from '@xdn/core/source'

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

const renderNextPage = (page: string, res: ResponseWriter) =>
  render(page, res, /* istanbul ignore next */ params => params, { rewritePath: false })

export default class NextRoutes extends PluginBase {
  private nextRouteGroupName = 'next_routes_group'
  private nextRootDir: string
  private pagesDir: string
  private pagesDirRelative: string
  private router?: Router
  private rewrites?: any[]
  private redirects?: any[]
  private routesManifest: any
  private distDir: string
  private defaultLocale?: string

  type = TYPE

  /**
   * Provides next registered routes to router
   * @param {Function} renderFn Next page render function
   */
  constructor() {
    super()
    this.nextRootDir = getSourceDir()
    this.pagesDirRelative = 'pages'
    this.pagesDir = join(this.nextRootDir, this.pagesDirRelative)
    this.distDir = getDistDir()

    if (!existsSync(this.pagesDir)) {
      this.pagesDirRelative = join('src', 'pages')
      this.pagesDir = join(this.nextRootDir, this.pagesDirRelative)
    }

    if (isProductionBuild() || isCloud()) {
      this.loadRewrites()
    } else {
      this.loadRewritesInDev().then(() => {
        if (this.rewrites || this.redirects) {
          this.updateRoutes()
        }
      })
    }

    if (!isProductionBuild()) {
      watch(this.pagesDir, { recursive: true }, () => this.updateRoutes())
    }
  }

  /**
   * Attempt to get rewrites and redirects from routes-manifest.json in production.
   */
  private loadRewrites() {
    const manifestPath =
      process.env.NEXT_ROUTES_MANIFEST_PATH ||
      join(process.cwd(), this.distDir, 'routes-manifest.json')

    this.routesManifest = nonWebpackRequire(manifestPath)
    const { rewrites, redirects } = this.routesManifest
    this.rewrites = rewrites
    this.redirects = redirects
  }

  /**
   * Returns the contents of pages-manifest.json
   */
  private getPagesManifest() {
    return nonWebpackRequire(join(process.cwd(), this.distDir, 'serverless', 'pages-manifest.json'))
  }

  /**
   * Returns the contents of prerender-manifest.json
   */
  private getPrerenderManifest() {
    return nonWebpackRequire(join(process.cwd(), this.distDir, 'prerender-manifest.json'))
  }

  /**
   * Attempt to get rewrites and redirects from the next config in development.
   */
  private async loadRewritesInDev() {
    console.log('> getting rewrites and redirects from next config')

    // @ts-ignore
    const { nextConfig } = global.XDN_NEXT_APP
    const rewritesFn = get(nextConfig, 'rewrites')

    if (rewritesFn) {
      this.rewrites = await rewritesFn()
    }

    const redirectsFn = get(nextConfig, 'redirects')

    if (redirectsFn) {
      this.redirects = await redirectsFn()
    }
  }

  /**
   * Called when plugin is registered
   * @param router
   */
  onRegister(router: Router) {
    this.router = router
    /* create route group and add all next routes into it */
    this.router.group(this.nextRouteGroupName, group => this.addNextRoutesToGroup(group))
    this.router.fallback(res => this.render404(res))
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
   * Adds next routes to route group
   * @param {RouteGroup} group
   */
  private addNextRoutesToGroup(group: RouteGroup) {
    this.addAssets(group)
    this.addImageOptimizerRoutes(group)

    if (isCloud()) {
      this.addPagesInProd(group)
      this.addPrerendering()
    } else {
      this.addPagesInDev(group)
    }

    this.addRewrites(group)
  }

  /**
   * Find an existing route that would match a request with destination as the path - we will run its handler when
   * the request's path matches the rewrite source.
   * @param group
   * @param source
   * @param destination
   * @param index
   */
  private addRewrite(group: RouteGroup, source: string, destination: string, index: number) {
    // Next.js adds /:nextInternalLocale(...) at the start of the source route - if we leave this in
    // the actually requests from the browser will never match.
    let normalizedSource = source.replace(/\/:nextInternalLocale[^/]+/, '')

    // Next.js adds /:nextInternalLocale at the start of the destination route - if we leave this in
    // we'll never find the destination route
    let normalizedDestination = destination.replace(/\/:nextInternalLocale[^/]*/, '')

    if (this.defaultLocale) {
      // Use the defaultLocale in place of the the :locale parameter since we restrict the locale to only the
      // configured locales. If we don't do this, we'll never find the destination route.
      normalizedDestination = normalizedDestination.replace(/:locale/, this.defaultLocale)
    }

    const destRoute = group.routes.find(route => {
      return route.match(<Request>{
        path: normalizedDestination,
      })
    })

    if (destRoute) {
      if (isProductionBuild()) {
        console.log(`[rewrite] ${source} => ${destRoute.criteria.path}`)
      }

      group.match(
        normalizedSource,
        res => {
          // need to extract the params again based on the new path
          res.rewrite(destination, <string>destRoute.criteria.path)
          destRoute.handler(res)
        },
        {
          index,
        }
      )
    } else {
      console.warn(`No matching route found for rewrite ${source} => ${destination}`)
    }
  }

  /**
   * Adds rewrites and redirects from next.config.js
   * @param group
   */
  private addRewrites(group: RouteGroup) {
    // support next.js rewrites
    if (this.rewrites) {
      for (let i = 0; i < this.rewrites.length; i++) {
        let { source, destination } = this.rewrites[i]

        // html route
        this.addRewrite(group, source, destination, i)

        // we need to rewrite the equivalent data route as well
        this.addRewrite(
          group,
          `/_next/data/:__build__${source}.json`,
          `/_next/data/:__build__${destination}.json`,
          i
        )
      }
    }

    // support next.js redirects
    if (this.redirects) {
      for (let { source, statusCode, destination } of this.redirects) {
        if (source !== '/:path+/') {
          // We remove the redirect that next.js automatically adds to remove trailing slashes because we already
          // do this in our own serveStatic implementation, and this redirect would prevent the fallback from working
          // because it would match all routes except '/'
          group.match(source, ({ redirect }) => {
            redirect(destination, { statusCode: statusCode || 302 })
          })
        }
      }
    }
  }

  /**
   * Adds routes for all pages and corresponding data in development
   * @param group
   */
  private addPagesInDev(group: RouteGroup) {
    // data
    group.match('/_next/data/:path*', ({ proxy }) => proxy(BACKENDS.js))

    // SSR,
    group.dir(this.pagesDirRelative, {
      ignore: ['_*'],
      paths: (file: string) => [toRouteSyntax(file)],
      handler: () => ({ proxy }) => proxy(BACKENDS.js),
    })
  }

  /**
   * Adds routes for react components and API handlers
   * @param {*} group
   */
  private addPagesInProd(group: RouteGroup) {
    const { routesManifest } = this
    const pagesManifest = this.getPagesManifest()
    const prerenderManifest = this.getPrerenderManifest()
    const locales = routesManifest.i18n?.locales
    this.defaultLocale = routesManifest.i18n?.defaultLocale

    const ssgRoutes = new Set<string>(
      Object.entries(prerenderManifest.routes)
        .filter(([_route, config]: [any, any]) => config.srcRoute == null)
        .map(([route, _config]: [any, any]) => route)
    )

    const pagesWithDataRoutes = new Set<string>(
      routesManifest.dataRoutes.map((route: any) => route.page)
    )

    const addRoute = (label: string, route: string, handler: RouteHandler) => {
      console.debug(`[${label}]`, route)
      group.match(route, handler)
    }

    const startsWithLocale = locales && new RegExp(`^/(${locales.join('|')})(/|$)`)
    const localizationEnabled = locales?.length > 0

    console.debug(`Next.js routes (locales: ${locales?.join(', ') || 'none'})`)
    console.debug('--------------')

    const pages = sortRoutes(Object.keys(pagesManifest), routesManifest)

    for (let page of pages) {
      const file = pagesManifest[page]
      const path = toRouteSyntax(page)

      if (page.startsWith('/api')) {
        // api routes
        addRoute('api', path, res => renderNextPage(page.slice(1), res))
      } else if (file && file.endsWith('.html')) {
        // static routes
        const assetPath = pagesManifest[page].replace(/^pages\//, '').replace(/\.html$/, '')

        if (this.defaultLocale && page.startsWith(`/${this.defaultLocale}`)) {
          // When the app uses internationalization, we collapse all static localized routes into a single
          // route to save router spacer, so for example en-US/sale and fr/sale become /:locale(en-US|fr)?/category/sale
          addRoute(
            'SSG html',
            localize(locales, this.removeLocale(page)),
            this.createSSGHandler(
              assetPath.replace(new RegExp(this.defaultLocale + '(/|$)'), ':locale$1')
            )
          )
        } else if (locales && startsWithLocale.test(page)) {
          // skip other locale routes as we collapse all into a single route above
        } else {
          // non-localized routes can simply be added verbatim
          addRoute('SSG html', path, this.createSSGHandler(assetPath))
        }
      } else {
        // dynamic routes
        const dynamicRouteConfig = prerenderManifest.dynamicRoutes[page]

        if (dynamicRouteConfig || ssgRoutes.has(page)) {
          // only add data routes for getServerSideProps and getStaticProps
          addRoute(
            'SSG (λ) json',
            `/_next/data/:__build__${localize(locales, toRouteSyntax(page, { suffix: 'json' }))}`,
            this.createSSGHandler(page, {
              dataRoute: true,
              localize: localizationEnabled,
            })
          )
          // SSG: getStaticProps
          addRoute(
            `SSG (λ${dynamicRouteConfig?.fallback ? ' w/fallback' : ''}) html`,
            localize(locales, toRouteSyntax(page)),
            this.createSSGHandler(page, {
              localize: localizationEnabled,
            })
          )
        } else {
          if (pagesWithDataRoutes.has(page)) {
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
    }
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
    const { routes } = this.getPrerenderManifest()
    const requests: PreloadRequestConfig[] = []

    for (let htmlPath in routes) {
      const route = routes[htmlPath]
      requests.push({ path: htmlPath })

      if (route.dataRoute) {
        requests.push({ path: route.dataRoute })
      }
    }

    const router = <Router>this.router

    // @ts-ignore - The typings for this methods
    router.prerender(requests)
  }

  /**
   * Production route handler for all dynamic HTML and JSON requests (SSR and SSG).
   * @param page The next.js page to render
   */
  private createSSRHandler(page: string) {
    // Note, we do not need to look up revalidate times from prerender-manifest.json
    // because Next automatically set cache-control: s-maxage=(revalidate), stale-while-revalidate
    return (res: ResponseWriter) => renderNextPage(page.slice(1), res)
  }

  /**
   * Creates a handler for SSG pages that can be optionally configured with fallback: trxdndfdue
   * @param page The next.js page path
   * @param options
   */
  private createSSGHandler(
    page: string,
    {
      dataRoute,
      localize,
    }: {
      dataRoute?: boolean
      localize?: boolean
    } = {}
  ) {
    return (res: ResponseWriter) => {
      const suffix = dataRoute ? 'json' : 'html'
      const assetRoot = `${this.distDir}/serverless/pages${localize ? '/:locale' : ''}`
      const assetFile = toRouteSyntax(page, { suffix }).replace(/\/\.(json|html)$/, '.$1') // fix for :locale/index.js
      const assetPath = `${assetRoot}${assetFile}`
      const prerenderManifest = this.getPrerenderManifest()
      const dynamicRouteConfig = prerenderManifest.dynamicRoutes[page]

      let fallback = dynamicRouteConfig?.fallback
      let loadingPage = !dataRoute && fallback ? `${assetRoot}${fallback}` : undefined

      // Note that the cache TTL is stored as a header on S3 based on the prerender-manifest.json,
      // so we don't need to use res.cache() here.

      res.serveStatic(assetPath, {
        loadingPage,
        onNotFound: () => {
          const isPrerendered = prerenderManifest.routes[res.request.path]

          // Note that fallback: 'blocking' in getStaticPaths results in fallback: null in prerender-manifest.json
          if (fallback !== false || isPrerendered || dataRoute) {
            // Fallback to SSR when fallback: true is set in getStaticPaths or when revalidating a prerendered page or when it's a data path
            return renderNextPage(page, res)
          } else {
            // Render the custom 404 when a static page is not found.
            return this.render404(res)
          }
        },
      })
    }
  }

  async render404(res: ResponseWriter) {
    if (isCloud()) {
      const pagesManifest = this.getPagesManifest()
      const notFoundPage = pagesManifest['/404'] || pagesManifest[`/${this.defaultLocale}/404`]
      const assetRoot = `${this.distDir}/serverless/pages${this.defaultLocale ? '/:locale' : ''}`

      if (notFoundPage && notFoundPage.endsWith('.html')) {
        // static 404
        await res.serveStatic(`${assetRoot}/404.html`, {
          statusCode: 404,
          statusMessage: 'Not Found',
        })
      } else {
        // dynamic 404
        res.response.statusCode = 404
        res.response.statusMessage = 'Not Found'
        await renderNextPage('404', res)
      }
    } else {
      return renderNextPage('404', res)
    }
  }

  /**
   * Adds routes for static assets, including /public and /.next/static
   */
  private addAssets(group: RouteGroup) {
    // public assets
    group.static('public', {
      handler: (file: string) => (res: ResponseWriter) => res.cache(PUBLIC_CACHE_CONFIG),
    })

    // webpack hot loader
    if (!isCloud()) {
      group.match('/_next/webpack-hmr', ({ stream }) => stream('__js__'))
    }

    // browser js
    // Notes:
    // - Assets with unique hashed filenames like JS, Css, and media are stored
    //   in a persistent bucket to be available across builds
    // - We can't apply that rule to the whole /static folder as it contains
    //   non-unique filenames like 'service-worker.js'. This will
    group.match('/_next/static/:path*', ({ proxy, serveStatic, cache }) => {
      if (isCloud() || isProductionBuild()) {
        cache(FAR_FUTURE_CACHE_CONFIG)
        serveStatic(`${this.distDir}/static/:path*`, {
          permanent: true,
          exclude: [`${this.distDir}/static/service-worker.js`],
        })
      } else {
        proxy(BACKENDS.js)
      }
    })
  }

  /**
   * Adds routes for image-optimizer
   */
  addImageOptimizerRoutes(group: RouteGroup) {
    group.match('/_next/image', ({ proxy }) => {
      // By default '/_next/image' indicates the image is to be optimized.
      // When we are local, we do not need to modify the path as the
      // local framework will, by default, optimize the image for us.
      // But in the cloud we replace '/_next/image' the '/__xdn_image_optimizer'
      // so XDN Buffer Proxy can route to the right lambda.
      const production = isProductionBuild()
      const backend = production ? BACKENDS.imageOptimizer : BACKENDS.js
      const opts = production ? { path: XDN_IMAGE_OPTIMIZER_PATH } : undefined
      proxy(backend, opts)
    })
  }
}

/**
 * Sort predefined routes before dynamic routes
 * @param pages
 */
function sortRoutes(pages: string[], routesManifest: any): string[] {
  const isDynamic = (page: string) => routesManifest.dynamicRoutes.find((r: any) => r.page === page)

  return pages
    .filter(p => !isDynamic(p))
    .concat(routesManifest.dynamicRoutes.map((r: any) => r.page))
}
