import { resolve } from 'path'
import { injectManifest } from 'workbox-build'

// Helper method from workbox to inject manifest into the
// service worker after nuxt finishes its build
export const injectManifestInServiceWorker = async (source: string, destination: string) => {
  const { warnings } = await injectManifest({
    globDirectory: resolve(process.cwd(), '.output', 'public'),
    globPatterns: ['_nuxt/*.*'],
    swSrc: source,
    swDest: destination,
  })

  if (warnings.length > 0) {
    console.warn('Warnings encountered while injecting the manifest:', warnings.join('\n'))
  }
}
