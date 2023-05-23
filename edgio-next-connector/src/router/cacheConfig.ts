import { FAR_FUTURE_TTL_WITH_UNIT } from '../constants'
import { CacheOptions } from '@edgio/core/router/CacheOptions'

export const FAR_FUTURE_CACHE_CONFIG: CacheOptions = {
  browser: {
    maxAgeSeconds: FAR_FUTURE_TTL_WITH_UNIT, // 1 year
  },
  edge: {
    maxAgeSeconds: FAR_FUTURE_TTL_WITH_UNIT,
  },
}

export const PUBLIC_CACHE_CONFIG: CacheOptions = {
  browser: false,
  edge: {
    maxAgeSeconds: FAR_FUTURE_TTL_WITH_UNIT,
  },
}

export const SHORT_PUBLIC_CACHE_CONFIG: CacheOptions = {
  browser: {
    maxAgeSeconds: '1h',
  },
  edge: {
    maxAgeSeconds: FAR_FUTURE_TTL_WITH_UNIT,
  },
}
