import { nonWebpackRequire } from '@edgio/core/utils'
import { join } from 'path'
import { existsSync } from '@edgio/core/utils/fs'
import NextPathFormatter from './nextPathFormatter'
import getNextConfig from '../getNextConfig'
import { removeLocale } from '../util/localeUtils'
import { pathToRegexp } from 'path-to-regexp'
import {
  RenderMode,
  Page,
  PageType,
  PageSourceType,
  FallbackType,
  PAGE_SOURCE_TYPES,
  PAGE_TYPES,
  FALLBACK_TYPES,
  PrerenderedRoute,
} from '../types'
import { isCloud, isProductionBuild } from '@edgio/core/environment'
import getBuildId from '../util/getBuildId'
import globby from 'globby'
import { getPageExtensionsFromConfig } from '../util/getPageExtensions'

export default class ManifestParser {
  protected routesManifest: any
  protected prerenderManifest: any
  protected middlewareManifest: any
  protected pagesManifest: any
  protected appPathsManifest: any

  protected pageFiles: any
  protected nextRootDir: string
  protected distDir: string
  protected pagesDir: string
  protected appDir: string

  protected renderMode: RenderMode
  protected locales: string[] = []
  protected defaultLocale?: string
  protected nextPathFormatter: NextPathFormatter
  protected buildId: string = 'dev'
  protected nextConfig: any

  /**
   * @param nextRootDir The path to project root
   * @param distDir The name of dist folder
   * @param renderMode The render mode
   */
  constructor(nextRootDir: string, distDir: string, renderMode: RenderMode) {
    this.nextRootDir = nextRootDir
    this.distDir = distDir
    this.renderMode = renderMode
    this.nextConfig = getNextConfig()
    this.nextPathFormatter = new NextPathFormatter(this.nextConfig)

    this.locales = this.nextConfig?.i18n?.locales || []
    this.defaultLocale = this.nextConfig?.i18n?.defaultLocale

    this.pagesDir = existsSync(join(this.nextRootDir, 'src', 'pages'))
      ? join(this.nextRootDir, 'src', 'pages')
      : join(this.nextRootDir, 'pages')
    this.appDir = existsSync(join(this.nextRootDir, 'src', 'app'))
      ? join(this.nextRootDir, 'src', 'app')
      : join(this.nextRootDir, 'app')

    // Exit when we are in development mode
    if (!isProductionBuild() && !isCloud()) return

    this.buildId = getBuildId(join(process.cwd(), this.nextRootDir, this.distDir))
    this.routesManifest = this.getRoutesManifest()
    this.prerenderManifest = this.getPrerenderManifest()
    this.middlewareManifest = this.getMiddlewareManifest()
    this.pagesManifest = this.getPagesManifest()
    this.appPathsManifest = this.getAppPathsManifest()

    this.pageFiles = { ...this.pagesManifest, ...this.appPathsManifest }
  }

  /**
   * Returns the objects of parsed pages
   * @param includeTemplates
   */
  getPages(includeTemplates = false): Page[] {
    if (isProductionBuild() || isCloud()) {
      return this.getPagesInProd(includeTemplates)
    }
    return this.getPagesInDev(includeTemplates)
  }

  /**
   * Returns the objects of parsed extracted from
   * the pages and app directory because there is no manifest file.
   * Pages in development mode are not pre-rendered and all marked as SSR.
   * @param includeTemplates
   */
  protected getPagesInDev(includeTemplates = false): Page[] {
    let pages: Page[] = []
    const pageExtensions = getPageExtensionsFromConfig(this.nextConfig)

    // Get page routes from pages directory
    globby.sync(`**/*.{${pageExtensions.join(',')}}`, { cwd: this.pagesDir }).forEach(file => {
      const pageName = this.nextPathFormatter.toCleanPath(file)
      if (!includeTemplates && this.isTemplate(pageName)) return
      pages.push({
        name: pageName,
        nameWithoutLocale: pageName,
        ...this.nextPathFormatter.getRouteVariations(pageName, {
          locales: this.locales,
        }),
        type: PAGE_TYPES.ssr,
        pageSource: PAGE_SOURCE_TYPES.pages,
      })
    })

    // Get page routes from app directory
    globby.sync(`**/page.{${pageExtensions.join(',')}}`, { cwd: this.appDir }).forEach(file => {
      const pageName = this.nextPathFormatter.toCleanPath(`/${file}`.replace('/page', ''))
      pages.push({
        name: pageName,
        nameWithoutLocale: pageName,
        ...this.nextPathFormatter.getRouteVariations(pageName, {
          locales: this.locales,
        }),
        type: PAGE_TYPES.ssr,
        pageSource: PAGE_SOURCE_TYPES.app,
      })
    })
    return pages
  }

  /**
   * Returns the objects of parsed pages
   * extracted from the manifest files.
   * @param includeTemplates
   */
  protected getPagesInProd(includeTemplates = false): Page[] {
    let pages: Page[] = []

    for (const pageName in this.pageFiles) {
      if (!includeTemplates && this.isTemplate(pageName)) continue
      const pageNameWithoutLocale = removeLocale(pageName, this.locales)
      const dataRouteData = this.getDataRoute(pageName)
      const { route, localizedRoute, dataRoute, localizedDataRoute } =
        this.nextPathFormatter.getRouteVariations(pageName, {
          locales: this.locales,
        })

      let page = <Page>{
        name: pageName,
        nameWithoutLocale: pageNameWithoutLocale,
        route,
        localizedRoute,
        isPrerendered: this.isPrerendered(pageName),
        isDynamic: this.isDynamic(pageNameWithoutLocale),
      }
      if (dataRouteData) {
        page.dataRoute = dataRoute
        page.localizedDataRoute = localizedDataRoute
      }
      if (page?.isPrerendered) {
        page.fallback = this.getFallbackType(pageName)
      }
      if (page?.fallback === FALLBACK_TYPES.true) {
        page.fallbackPage = this.getFallback(pageName) as string
      }
      if (page?.isPrerendered) {
        page.prerenderedRoutes = this.getPrerenderedRoutes(page)
      }
      page.hasRevalidation = page?.prerenderedRoutes?.some(
        ({ initialRevalidateSeconds }) => initialRevalidateSeconds
      )
      page.type = this.getPageType(page)
      page.pageSource = this.getPageSourceType(pageName)

      pages.push(page)
    }

    return this.sortPages(pages)
  }

  /**
   * Attempt to get redirects from routes-manifest.json in production
   * and from next.config.js in development.
   */
  getRedirects(): any[] {
    let redirects =
      isProductionBuild() || isCloud() ? this.routesManifest?.redirects : this.nextConfig?.redirects
    // We need to reverse the order to match the sailfish behavior when only the last one is applied.
    return Array.isArray(redirects) ? redirects.reverse() : []
  }

  /**
   * Returns page type based on it's properties
   * @param page
   */
  getPageType(page: Page): PageType {
    const hasFileWithHtmlExtension = this.hasFileWithHtmlExtension(page.name)
    if (this.isTemplate(page.name)) return PAGE_TYPES.template
    if (page.name.startsWith('/api')) return PAGE_TYPES.api
    if (page.isPrerendered && page.isDynamic && !hasFileWithHtmlExtension && !page.hasRevalidation)
      return PAGE_TYPES.isg
    if (page.isPrerendered && page.isDynamic && !hasFileWithHtmlExtension && page.hasRevalidation)
      return PAGE_TYPES.isr
    if (page.isPrerendered) return PAGE_TYPES.ssg
    return PAGE_TYPES.ssr
  }

  /**
   * Returns fallback type based on value from dynamicRoutes.
   * @param pageName
   */
  getFallbackType(pageName: string): FallbackType | undefined {
    const fallback = this.getFallback(pageName)
    if (fallback === null) return FALLBACK_TYPES.blocking
    if (typeof fallback === 'string') return FALLBACK_TYPES.true
    if (fallback === false) return FALLBACK_TYPES.false
    return undefined
  }

  /**
   * Returns page source type. Can be located in 'app' or 'pages' folder.
   * @param pageName
   */
  getPageSourceType(pageName: string): PageSourceType | undefined {
    if (this.pagesManifest[pageName]) return PAGE_SOURCE_TYPES.pages
    if (this.appPathsManifest[pageName]) return PAGE_SOURCE_TYPES.app
    return undefined
  }

  /**
   * Returns the contents of routes-manifest.json
   */
  public getRoutesManifest(): any {
    const routesManifestPath =
      process.env.NEXT_ROUTES_MANIFEST_PATH ||
      join(process.cwd(), this.nextRootDir, this.distDir, 'routes-manifest.json')

    return nonWebpackRequire(routesManifestPath)
  }

  /**
   * Returns the contents of pages-manifest.json
   */
  public getPagesManifest(): any {
    return nonWebpackRequire(
      join(process.cwd(), this.nextRootDir, this.distDir, this.renderMode, 'pages-manifest.json')
    )
  }

  /**
   * Returns the content of app-paths-manifest.json
   * and changes the format of keys to correct URLs
   */
  public getAppPathsManifest(): any {
    const location = join(
      process.cwd(),
      this.nextRootDir,
      this.distDir,
      this.renderMode,
      'app-paths-manifest.json'
    )
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
  public getMiddlewareManifest(): any {
    const path = join(
      process.cwd(),
      this.nextRootDir,
      this.distDir,
      this.renderMode,
      'middleware-manifest.json'
    )
    if (existsSync(path)) return nonWebpackRequire(path)
    return {
      sortedMiddleware: [],
      middleware: {},
    }
  }

  /**
   * Returns the contents of prerender-manifest.json
   */
  public getPrerenderManifest(): any {
    const path = join(process.cwd(), this.nextRootDir, this.distDir, 'prerender-manifest.json')
    try {
      return nonWebpackRequire(path)
    } catch (e) {
      if (process.env.DEBUG === 'true') console.log(`${path} not found`)
      return {}
    }
  }

  /**
   * Returns true if page path is dynamic
   * @param pageNameWithoutLocale
   */
  isDynamic(pageNameWithoutLocale: string): boolean {
    return (
      this.routesManifest.dynamicRoutes.find((r: any) => r.page === pageNameWithoutLocale) !==
      undefined
    )
  }

  /**
   * Returns true if the specified page was statically rendered at build time (no getServerSideProps or getInitialProps)
   * @param page The page key
   * @returns
   */
  protected isPrerendered(page: string): boolean {
    const file = this.pageFiles[page] || ''
    const pageSource = this.getPageSourceType(page) || ''
    let routeKey = (this.defaultLocale ? `/${this.defaultLocale}` : '') + `${page}`

    if (routeKey !== '/') {
      routeKey = routeKey.replace(/\/$/, '')
    }

    return (
      file.endsWith('.html') ||
      this.prerenderManifest.routes[routeKey] != null ||
      this.prerenderManifest.dynamicRoutes[page] != null ||
      existsSync(join(this.nextRootDir, this.distDir, this.renderMode, pageSource, `${page}.html`))
    )
  }

  /**
   * Returns true if page is with HTML extension in pages or app paths manifest files.
   * That means that page was statically rendered at build time and had no getServerSideProps or getInitialProps functions.
   * @param pageName
   * @returns
   */
  protected hasFileWithHtmlExtension(pageName: string): boolean {
    return this.pageFiles[pageName]?.endsWith('.html') || false
  }

  /**
   * Returns object with dataRoute of page
   * or undefined if page has no dataRoute
   * @param pageName
   * @returns
   */
  protected getDataRoute(pageName: string): string | undefined {
    return this.routesManifest.dataRoutes.find((route: any) => route.page === pageName)
  }

  /**
   * Returns the list of prerendered routes of provided page.
   * @param page
   * @returns
   */
  protected getPrerenderedRoutes(page: Page): PrerenderedRoute[] {
    const localizedRouteRegex = pathToRegexp(page.localizedRoute)

    let pageRoutes = Object.keys(this.prerenderManifest.routes).filter(route => {
      const srcRoute = this.prerenderManifest.routes[route]?.srcRoute

      // When we have srcRoute, we can pair prerendered route with page based on its page name.
      if (srcRoute) return srcRoute === page.name

      // When we don't have srcRoute, we need to match prerendered route with page route by regex.
      // We'll get here only for pages with static route.
      return !page.isDynamic && route.match(localizedRouteRegex)
    })

    // If page is prerendered during the build and has no getServerSideProps or getStaticProps,
    // the page is not listed in prerender-manifest file.
    // The page has the file .html extension in pages-manifest or app-paths-manifest file instead.
    if (this.hasFileWithHtmlExtension(page.name)) {
      pageRoutes.push(page.name)
    }

    // When localizations is enabled
    if (this.defaultLocale) {
      // If prerendered route is starting with default locale,
      // we need to add the route without locale prefix too.
      // Example: /en-US/blog => /blog
      pageRoutes = pageRoutes.flatMap(route => {
        if (!route.startsWith(`/${this.defaultLocale}`)) return route
        return [route, route.replace(`/${this.defaultLocale}`, '/').replace(/\/\//g, '/')]
      })
    }

    return pageRoutes.map(nextRoute => ({
      nextRoute,
      route: this.nextPathFormatter.toRouteSyntax(nextRoute),
      dataRoute: page?.dataRoute
        ? this.nextPathFormatter.getDataRoute(nextRoute, this.buildId)
        : undefined,
      // Each prerendered route of page can have different initialRevalidateSeconds value,
      // although Next.js is showing only one value in build logs.
      initialRevalidateSeconds: this.getRevalidateSeconds(nextRoute),
    }))
  }

  /**
   * Returns initialRevalidateSeconds value for given prerendered route
   * or undefined when it doesn't exist.
   * @param pageRoute
   * @returns
   */
  protected getRevalidateSeconds(pageRoute: string): boolean | number | undefined {
    const revalidationSeconds = this.prerenderManifest?.routes[pageRoute]?.initialRevalidateSeconds
    if (revalidationSeconds !== undefined) return revalidationSeconds
    if (this.defaultLocale) {
      return this.prerenderManifest?.routes[`/${this.defaultLocale}${pageRoute}`]
        ?.initialRevalidateSeconds
    }
    return undefined
  }

  /**
   * Returns fallback value for given prerendered route
   * or undefined when it doesn't exist.
   * @param pageRoute
   * @returns
   */
  protected getFallback(pageRoute: string): string | boolean | null | undefined {
    return this.prerenderManifest?.dynamicRoutes[pageRoute]?.fallback
  }

  /**
   * Returns previewModeId from prerender-manifest
   * @returns
   */
  getPreviewModeId(): string | undefined {
    return this.prerenderManifest?.preview?.previewModeId
  }

  /**
   * Returns locales from routes-manifest
   * @returns
   */
  getLocales(): string[] {
    return this.locales || []
  }

  /**
   * Returns default locale from routes-manifest
   * @returns
   */
  getDefaultLocale(): string | undefined {
    return this.defaultLocale
  }

  /**
   * Returns true if page name is one of the template names
   * @returns
   */
  protected isTemplate(pageName: string) {
    return pageName.match(/\/(_app|_document|_error)$/)
  }

  /**
   * Sorts pages so the most matching dynamic routes are first.
   * The static routes are added at the end.
   * @param pages Page paths
   */
  sortPages(pages: Page[]): Page[] {
    const indexFor = (lPage: Page) =>
      pages.findIndex((rPage: Page) => rPage.name === lPage.name && rPage.isDynamic)
    let staticRoutes = [],
      dynamicRoutes = []

    for (let page of pages) {
      if (page.isDynamic) {
        dynamicRoutes.push(page)
        continue
      }
      staticRoutes.push(page)
    }

    // Dynamic routes need to be ordered by priority (from most dynamic to least dynamic)
    dynamicRoutes.sort((pageA: Page, pageB: Page) => {
      return indexFor(pageB) - indexFor(pageA)
    })

    return dynamicRoutes.concat(staticRoutes)
  }
}
