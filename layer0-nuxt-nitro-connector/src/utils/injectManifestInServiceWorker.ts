import { resolve } from 'pathe'
import { injectManifest } from 'workbox-build'
import { bundle } from './bundle'

const SOURCE_SERVICE_WORKER = resolve(process.cwd(), 'sw', 'service-worker.js')
const WORKBOX_SERVICE_WORKER = resolve(process.cwd(), '.output', 'injected-service-worker.js')
const DESTINATION_SERVICE_WORKER = resolve(
  process.cwd(),
  '.output',
  'public',
  '_nuxt',
  'service-worker.js'
)

// Helper method from workbox to inject manifest into the
// service worker after nuxt finishes its build
export const injectManifestInServiceWorker = async () => {
  const { warnings } = await injectManifest({
    globDirectory: resolve(process.cwd(), '.output', 'public'),
    globPatterns: ['_nuxt/*.*'],
    swDest: WORKBOX_SERVICE_WORKER,
    swSrc: SOURCE_SERVICE_WORKER,
  })

  if (warnings.length > 0) {
    console.warn('Warnings encountered while injecting the manifest:', warnings.join('\n'))
  }

  await bundle({
    entryPoints: [WORKBOX_SERVICE_WORKER],
    outfile: DESTINATION_SERVICE_WORKER,
    // The @layer0/prefetch library checks for some environment variables being assigned.
    // Before switching to ESBuild, process.env was polyfilled by webpack.
    define: { 'process.env': JSON.stringify({}) },
  })
}
