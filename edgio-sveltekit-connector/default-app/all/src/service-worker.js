import { skipWaiting, clientsClaim } from 'workbox-core'
import { precacheAndRoute } from 'workbox-precaching'
const { Prefetcher } = require('@edgio/prefetch/sw')

skipWaiting()
clientsClaim()
precacheAndRoute([])

new Prefetcher().route([])
