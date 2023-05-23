import { FAR_FUTURE_TTL } from '@edgio/core/constants'
import { CacheOptions } from '@edgio/core/router/CacheOptions'

export const FAR_FUTURE_CACHE_CONFIG: CacheOptions = {
  browser: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
  edge: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
}

export const PUBLIC_CACHE_CONFIG: CacheOptions = {
  browser: {
    maxAgeSeconds: '1h',
  },
  edge: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
}
