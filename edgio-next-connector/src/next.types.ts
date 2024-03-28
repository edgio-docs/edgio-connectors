export interface Redirect {
  source: string
  destination: string
  permanent?: boolean
  statusCode: number
  locale?: string | boolean
  internal?: boolean
  has?: HasMatcher[]
}

export interface RewriteGroup {
  beforeFiles: Rewrite[]
  afterFiles: Rewrite[]
  fallback: Rewrite[]
}

export interface Rewrite {
  source: string
  destination: string
  has?: HasMatcher[]
}

export interface HasMatcher {
  type: string
  key?: string
  value: string
}

export interface Images {
  /**
   * Old option for allowed domains
   * that was deprecated in Next.js 14.
   */
  domains?: string[]

  /**
   * Newer option for allowed remote patterns
   * that is available since Next.js 12.
   */
  remotePatterns?: [
    {
      protocol?: string
      port?: string | number
      /**
       * The wildcard patterns can be used for both pathname
       * and hostname and have the following syntax:
       * '*' - match a single path segment or subdomain
       * '**' - match any number of path segments at the end or subdomains at the beginning
       */
      pathname?: string
      hostname?: string
    }
  ]

  /**
   * The custom image loader file path.
   * This option is valid only with loader: 'custom'
   */
  loaderFile?: string
  loader?: 'default' | 'akamai' | 'cloudinary' | 'imgix' | 'fastly' | 'custom'
  imageSizes?: number[]
  deviceSizes?: number[]
  formats?: string[]
  minimumCacheTTL?: number
  disableStaticImages?: boolean
  dangerouslyAllowSVG?: boolean
  contentDispositionType?: string
  contentSecurityPolicy?: string
}

export interface NextConfig {
  target?: string
  i18n?: {
    locales: string[]
    defaultLocale: string
  }

  redirects?: () => Promise<Redirect[]>

  // Depending on whether we have next 12 and above, we can use the new rewrite group
  // as it was introduced in next 12 (note: we call it RewriteGroup, but who knows
  // what the official name is, as it is js, it could be without it)
  rewrites?: () => Promise<RewriteGroup | Rewrite[]>

  experimental?: {
    outputFileTracingRoot?: string
  }

  images?: Images
  basePath?: string
  pageExtensions?: string[]
  trailingSlash?: boolean
}

export const isRewriteGroup = (rewrite: RewriteGroup | Rewrite[]): rewrite is RewriteGroup => {
  return 'fallback' in rewrite || 'beforeFiles' in rewrite || 'afterFiles' in rewrite
}

export interface MiddlewareManifest {
  sortedMiddleware: string[]
  middleware: {
    [page: string]: Middleware
  }
  functions?: any
  version?: number
}

/**
 * Represents single Middleware property from
 * middleware-manifest.json
 */
export interface Middleware {
  /**
   * Files required for the middleware
   * @example ['middleware.js']
   */
  files: string[]

  /**
   * Middleware function name
   * @example 'middleware'
   */
  name: string

  /**
   * Matchers for the middleware
   * @example [{ regexp: '^/api/(.*)$', originalSource: '/api/:path*' }]
   */
  matchers: MiddlewareMatcher[]

  page: string
  wasm: string[]
  assets: string[]
}

export interface MiddlewareMatcher {
  /**
   * The regular expression to match the route
   * @example '^/api/(.*)$'
   */
  regexp: string

  /**
   * The original middleware
   * path in express-style format
   * @example '/api/:path*'
   */
  originalSource: string
}

export interface PrerenderManifest {
  routes: {
    [route: string]: {
      initialRevalidateSeconds: number | boolean
      srcRoute?: string
    }
  }
  dynamicRoutes: {
    [route: string]: {
      routeRegex: string
      dataRoute: string
      fallback: null | boolean | string
    }
  }
  notFoundRoutes: string[]
  preview?: {
    previewModeId: string
    previewModeSigningKey: string
    previewModeEncryptionKey: string
  }
  version?: number
}

export interface RoutesManifest {
  pages404?: boolean
  caseSensitive?: boolean
  basePath?: string
  redirects: Redirect[]
  headers: any[]
  rewrites?: RewriteGroup
  dynamicRoutes: Route[]
  staticRoutes: Route[]
  dataRoutes: DataRoute[]
  rsc?: Rsc
  version?: number
}

export interface Route {
  page: string
  regex: string
  namedRegex?: string
  routeKeys?: Record<string, string>
}

export interface DataRoute {
  page: string
  dataRouteRegex: string
  routeKeys?: Record<string, string>
  namedDataRouteRegex?: string
}

export interface Rsc {
  header?: string
  varyHeader?: string
  prefetchHeader?: string
  didPostponeHeader?: string
  contentTypeHeader?: string
  suffix?: string
  prefetchSuffix?: string
}

export interface PagesManifest {
  [key: string]: string
}

export interface AppPathsManifest {
  [key: string]: string
}
