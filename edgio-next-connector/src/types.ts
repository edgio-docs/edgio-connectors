import type Config from '@edgio/core/config'

/**
 * Extended object of config from edgio.config.js
 * with connector specific properties.
 */
export interface ExtendedConfig extends Config {
  next?: {
    /**
     * Output sourcemaps so that stack traces have original source filenames and line numbers when tailing
     * the logs in the Edgio developer console.
     * This config options replaces the edgioSourceMaps option in next.config.js.
     * @default true
     */
    generateSourceMaps?: boolean

    /**
     * Disables the Edgio image optimizer and allows to use the Next's built in image optimizer.
     * This config options replaces the disableImageOptimizer option in edgio.config.js root.
     * @default false
     */
    disableImageOptimizer?: boolean

    /**
     * Disables the Edgio development tools widget on the site.
     * This config options replaces the disableEdgioDevTools option in next.config.js.
     * @default false
     */
    disableDevtools?: boolean

    /**
     * Disables the build of the service worker.
     * @default false
     */
    disableServiceWorker?: boolean

    /**
     * Forces the @edgio/next connector to use the server build.
     * This config option replaces the NEXT_FORCE_SERVER_BUILD env variable.
     * @default false
     */
    forceServerBuild?: boolean

    /**
     * Optimizes the server build by bundling all server assets and decreasing the overall startup time.
     * This option has no effect on apps with serverless build.
     * This option is set to false for Next 13.x apps.
     * @default true
     */
    optimizeServerBuild?: boolean

    /**
     * Set this option to false to remove the default rule that proxies all requests to Next.js in serverless.
     * This is useful if you want to proxy all unmatched pages to different origin.
     * @default true
     */
    proxyToServerlessByDefault?: boolean

    /**
     * Set this option to true to honor Next's internal redirects that either add or remove a trailing slash
     * depending on the value of the `trailingSlash` config. When set to false, these internal redirects are not honored,
     * so sites that fallback to serving from an origin do not add or remove the trailing slash for origin URLs.
     * @default true
     */
    enforceTrailingSlash?: boolean
  }
}

export const RENDER_MODES = {
  server: 'server',
  serverless: 'serverless',
}

export const PAGE_SOURCE_TYPES = {
  app: 'app',
  pages: 'pages',
}

export const PAGE_TYPES = {
  // Always rendered in serverless by the next server.
  ssr: 'SSR',

  // Prerendered at build time and uploaded to S3 and served directly by the CDN.
  ssg: 'SSG',

  // Prerendered at build time for defined URLs of getStaticPaths are served from S3.
  // Other URLs are rendered based on the fallback type.
  isg: 'ISG',

  // Same as ISG but the prerendered pages on S3 can expire,
  // and then it's updated by the response from next server.
  isr: 'ISR',

  // Always rendered in serverless by the next server.
  api: 'API',

  // Template files such as _app.js, _document.js, _error.js, etc. We ignore them.
  template: 'TEMPLATE',
}

export const FALLBACK_TYPES = {
  // URLs which were not prerendered at build time are rendered asynchronously.
  // The fallback page version is served in meantime.
  true: 'fallback:true',

  // URLs which were not prerendered at build time are not rendered.
  // The prerendered 404 Not Found is returned instead.
  false: 'fallback:false',

  // URLs which were not prerendered at build time are rendered by the next server
  // and cached for long time. Same as SSR.
  blocking: 'fallback:blocking',
}

export type RenderMode = (typeof RENDER_MODES)[keyof typeof RENDER_MODES]
export type PageType = (typeof PAGE_TYPES)[keyof typeof PAGE_TYPES]
export type PageSourceType = (typeof PAGE_SOURCE_TYPES)[keyof typeof PAGE_SOURCE_TYPES]
export type FallbackType = (typeof FALLBACK_TYPES)[keyof typeof FALLBACK_TYPES]
export type ExpressStyleRoute = string & { __brand: 'ExpressStyleRoute' }
export type NextStyleRoute = string & { __brand: 'ExpressStyleRoute' }

/**
 * Represents one page in the Next.js application.
 */
export interface Page {
  /**
   * Page name in Next format
   * @example '/en-US/products/[id]'
   */
  name: string

  /**
   * Page name in Next format without locale
   * @example '/products/[id]'
   */
  nameWithoutLocale: string

  /**
   * Page route in express-style format
   * @example '/products/:id'
   */
  route: string

  /**
   * Localized page route in express-style format
   * @example '/:locale(en-US|cs-CZ)/products/:id'
   */
  localizedRoute: string

  /**
   * Page data route in express-style format.
   * This property is added only when page has data route.
   * @example '/_next/data/:__build__/products/:id.json'
   */
  dataRoute?: string

  /**
   * Localized page data route in express-style format.
   * This property is added only when page has data route.
   * @example '/:locale(en-US|cs-CZ)/_next/data/:__build__/products/:id.json'
   */
  localizedDataRoute?: string

  /**
   * True when page was prerendered during the build.
   * This page can be SSG, ISG or ISR.
   */
  isPrerendered?: boolean

  /**
   * The list of prerendered routes of this page.
   */
  prerenderedRoutes?: string[]

  /**
   * True if page has any param in its path.
   * @example '/products/[id]' -> true
   * @example '/api/hello' -> false
   */
  isDynamic?: boolean

  /**
   * The page fallback type from
   * This property is added only for pages with type 'ISG' or 'ISR'.
   * @example 'fallback:blocking'
   */
  fallback?: FallbackType

  /**
   * True if page is
   * @example '/products/[id]' -> true
   */
  fallbackPage?: string

  /**
   * The page type found out from other properties.
   * @example 'SSR'
   */
  type?: PageType

  /**
   * The page source type. Can be 'app' or 'pages'.
   * @example 'app'
   */
  pageSource?: PageSourceType

  /**
   * The time after page should be revalidated.
   * This property is added only for prerendered pages.
   * @example false
   */
  initialRevalidateSeconds?: number | boolean
}
