import { resolve } from 'path'
import { bundle } from './bundle'
import { injectManifestInServiceWorker } from './injectManifestInServiceWorker'

const SOURCE_SERVICE_WORKER = resolve(process.cwd(), 'sw', 'service-worker.js')
const WORKBOX_SERVICE_WORKER = resolve(process.cwd(), '.output', 'injected-service-worker.js')
const DESTINATION_SERVICE_WORKER = resolve(
  process.cwd(),
  '.output',
  'public',
  '_nuxt',
  'service-worker.js'
)
export const buildServiceWorker = async (devMode?: boolean) => {
  let serviceWorkerSource = ''

  if (devMode === true) {
    // In dev mode, copy default service worker, we don't need to inject
    // manifest as we don't care about prefetch in dev mode
    serviceWorkerSource = SOURCE_SERVICE_WORKER
  } else {
    await injectManifestInServiceWorker(SOURCE_SERVICE_WORKER, WORKBOX_SERVICE_WORKER)
    serviceWorkerSource = WORKBOX_SERVICE_WORKER
  }

  await bundle({
    entryPoints: [serviceWorkerSource],
    outfile: DESTINATION_SERVICE_WORKER,
    // The @edgio/prefetch library checks for some environment variables being assigned.
    // Before switching to ESBuild, process.env was polyfilled by webpack.
    define: { 'process.env': JSON.stringify({}) },
  })
}
