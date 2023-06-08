import { skipWaiting, clientsClaim } from 'workbox-core'
import { Prefetcher } from '@edgio/prefetch/sw'

skipWaiting()
clientsClaim()

new Prefetcher().route()
