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

export interface NextConfig {
  target?: string
  i18n?: {
    locales: string[]
    defaultLocale: string
  }

  redirects?: () => Promise<Redirect[]>

  // Depending wheter we have next 12 and above, we can use the new rewrite group
  // as it was introduced in next 12 (note: we call it RewriteGroup, but who knows
  // what the official name is, as it is js, it could be without it)
  rewrites?: () => Promise<RewriteGroup | Rewrite[]>

  experimental?: {
    outputFileTracingRoot?: string
  }

  basePath?: string
}

export const isRewriteGroup = (rewrite: RewriteGroup | Rewrite[]): rewrite is RewriteGroup => {
  return 'fallback' in rewrite || 'beforeFiles' in rewrite || 'afterFiles' in rewrite
}
