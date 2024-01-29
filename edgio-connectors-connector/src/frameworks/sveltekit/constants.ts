import { FAR_FUTURE_TTL } from '@edgio/core/constants'
import { CacheOptions } from '@edgio/core/router/CacheOptions'

/**
 * @private
 * The name of folder where we put prerendered HTML pages.
 */
export const PRERENDERED_PAGES_FOLDER = 'prerendered_pages'

export const FAR_FUTURE_CACHE_CONFIG: CacheOptions = {
  browser: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
  edge: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
}

export const PUBLIC_CACHE_CONFIG: CacheOptions = {
  browser: false,
  edge: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
}
