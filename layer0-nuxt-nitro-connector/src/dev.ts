import createDevServer from '@layer0/core/dev/createDevServer'
import { injectManifestInServiceWorker } from './utils/injectManifestInServiceWorker'

export default async function dev() {
  // This will add an empty manifest, but we don't care as we are in dev mode
  await injectManifestInServiceWorker()

  return createDevServer({
    label: 'Nuxt',
    command: port => `npx nuxt dev --port ${port}`,
    ready: [/> Local:/],
  })
}
