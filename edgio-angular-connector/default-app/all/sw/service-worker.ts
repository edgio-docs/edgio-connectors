import { Prefetcher } from '@edgio/prefetch/sw'
import { skipWaiting, clientsClaim } from 'workbox-core'

skipWaiting()
clientsClaim()

new Prefetcher().route()
