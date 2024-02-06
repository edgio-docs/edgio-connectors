export interface Redirect {
  source: string
  destination: string
  permanent?: boolean
  statusCode?: number
  locale?: string
  internal?: boolean
  has: {
    type: string
    key: string
    value: string
  }[]
}

export interface RewriteGroup {
  beforeFiles: Rewrite[]
  afterFiles: Rewrite[]
  fallback: Rewrite[]
}

export interface Rewrite {
  source: string
  destination: string
  has: {
    type: string
    key: string
    value: string
  }[]
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
}

export const isRewriteGroup = (rewrite: RewriteGroup | Rewrite[]): rewrite is RewriteGroup => {
  return 'fallback' in rewrite || 'beforeFiles' in rewrite || 'afterFiles' in rewrite
}
