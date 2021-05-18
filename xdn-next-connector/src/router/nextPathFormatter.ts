import slash from 'slash'

/**
 * Removes extensions and index from next path
 *
 * @example
 * /index.js => /
 * /main.html => /main
 */
export const toCleanPath = (pagePath: string) =>
  slash(`/${pagePath.replace(/\.[^.]*$/, '').replace(/(^|)\/?index$/, '')}`)

/**
 * Converts next path to express route syntax
 * @example
 * /[param1]/[param2] => /:param1/:param2
 * /[...path] => /:path*
 * @param pagePage The next page path, for example /products/[id]
 * @param isDataRoute true if we are creating a route for a call to getStaticProps or getServerSideProps
 */
export const toRouteSyntax = (
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
    return toCleanPath(route)
  }
}

export function localize(locales: string[] | undefined, route: string) {
  if (locales) {
    return `/:locale(${locales.join('|')})?${route}`
      .replace(/\/$/, '') // remove trailing slash if one exists
      .replace(/\)\?\/(index)?\.(json|html)$/, '|index).json') // accept index.json instead of {locale}.json for the default locale
  } else {
    return route
  }
}
