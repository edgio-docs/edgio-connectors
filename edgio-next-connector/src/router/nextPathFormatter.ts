import slash from 'slash'
import { getPageExtensionsFromConfig } from '../util/getPageExtensions'
import { removeLocale, startsWithLocale } from '../util/localeUtils'
import { NextConfig } from '../next.types'

export default class NextPathFormatter {
  private nextConfig: NextConfig

  /**
   * Provides formatting functions for next paths
   * @param nextConfig The configuration of next
   */
  constructor(nextConfig: any) {
    this.nextConfig = nextConfig
  }

  /**
   * Removes extensions and index from next path
   *
   * @param pagePath The next page path, for example /products/[id]
   * @example
   * /index.js => /
   * /main.html => /main
   */
  public toCleanPath = (pagePath: string) => {
    const pageExtensions = getPageExtensionsFromConfig(this.nextConfig)

    // Remove all default extensions or extensions defined in next config file
    for (const extension of pageExtensions) {
      if (pagePath.endsWith(`.${extension}`)) {
        pagePath = pagePath.replace(new RegExp(`.${extension}$`), '')
        break
      }
    }
    return slash(`/${pagePath.replace(/(^|)\/?index$/, '')}`).replace(/\/+/g, '/')
  }

  /**
   * Converts next path to express route syntax
   * @example
   * /[param1]/[param2] => /:param1/:param2
   * /[...path] => /:path*
   * @param pagePath The next page path, for example /products/[id]
   */
  public toRouteSyntax = (pagePath: string) => {
    let route = slash(
      pagePath
        .replace(/^\//, '') // replace the leading slash if present so we can accept both products/[id].js and /products/[id]
        .replace(/\[\[\.\.\.([^\]]+)\]\]/g, ':$1*') // replace [[...path]] with :path*
        .replace(/\[\.\.\.([^\]]+)\]/g, ':$1+') // replace [...path] with :path+
        .replace(/\[([^\]]+)\]/g, ':$1') // replace [id] with :id
    )
    return this.toCleanPath(route)
  }

  public localize(locales: string[], route: string): string {
    if (locales.length) {
      return `/:locale(${locales.join('|')})?${route}`
        .replace(/\/$/, '') // remove trailing slash if one exists
        .replace(/\)\?\/(index)?\.(json|html)$/, '|index).json') // accept index.json instead of {locale}.json for the default locale
    }
    return route
  }

  /**
   * Generates dataRoute from page name
   * @returns
   */
  getDataRoute(pageName: string, buildId: string = ':buildId') {
    return `/_next/data/${buildId}${pageName === '/' ? '/index' : pageName}.json`
  }

  /**
   * Generates route and dataRoute in regex-to-path format from page name
   * and returns object with localized variations of them.
   * @returns
   */
  getRouteVariations(
    pageName: string,
    { buildId, locales }: { buildId?: string; locales?: string[] } = {}
  ) {
    locales = locales || []
    buildId = buildId || ':buildId'

    const route = this.toRouteSyntax(pageName)

    // Some pages in pages and app paths manifest file are already with locale prefix,
    // so we need to check it before we can localize it
    const localizedRoute = !startsWithLocale(route, locales) ? this.localize(locales, route) : route
    // Remove locale if they are provided and the route starts with one of them
    const routeWithoutLocale = removeLocale(route, locales)
    const dataRoute = this.getDataRoute(routeWithoutLocale, buildId)
    const localizedDataRoute = this.getDataRoute(
      this.localize(locales, routeWithoutLocale),
      buildId
    )

    return {
      route,
      localizedRoute,
      dataRoute,
      localizedDataRoute,
    }
  }
}
