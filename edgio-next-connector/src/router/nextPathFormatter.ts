import slash from 'slash'
import { getPageExtensionsFromConfig } from '../util/getPageExtensions'

export default class NextPathFormatter {
  private nextConfig: any

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
    return slash(`/${pagePath.replace(/(^|)\/?index$/, '')}`)
  }

  /**
   * Converts next path to express route syntax
   * @example
   * /[param1]/[param2] => /:param1/:param2
   * /[...path] => /:path*
   * @param pagePath The next page path, for example /products/[id]
   * @param isDataRoute true if we are creating a route for a call to getStaticProps or getServerSideProps
   */
  public toRouteSyntax = (
    pagePath: string,
    { suffix, locale }: { suffix?: string; locale?: string } = {}
  ) => {
    let route = slash(
      pagePath
        .replace(/^\//, '') // replace the leading slash if present so we can accept both products/[id].js and /products/[id]
        .replace(/\[\[\.\.\.([^\]]+)\]\]/g, ':$1*') // replace [[...path]] with :path*
        .replace(/\[\.\.\.([^\]]+)\]/g, ':$1+') // replace [...path] with :path+
        .replace(/\[([^\]]+)\]/g, ':$1') // replace [id] with :id
    )

    if (locale) {
      route = `${locale}/${route}`
    }

    if (suffix) {
      if (route === '') {
        // the json data route for the homepage is a special case => index.json
        route = 'index'
      }

      return `/${route}.${suffix}`
    } else {
      return this.toCleanPath(route)
    }
  }

  public localize(locales: string[], route: string) {
    if (locales.length) {
      return `/:locale(${locales.join('|')})?${route}`
        .replace(/\/$/, '') // remove trailing slash if one exists
        .replace(/\)\?\/(index)?\.(json|html)$/, '|index).json') // accept index.json instead of {locale}.json for the default locale
    } else {
      return route
    }
  }
}
