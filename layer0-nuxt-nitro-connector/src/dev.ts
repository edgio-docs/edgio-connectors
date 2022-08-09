import createDevServer from '@layer0/core/dev/createDevServer'
import { buildServiceWorker } from './utils/buildServiceWorker'

export default async function dev() {
  // Signal that we are in dev mode, this will create an empty manifest
  // from our default serviceWorker template
  buildServiceWorker(true)

  return createDevServer({
    label: 'Nuxt',
    command: port => `npx nuxt dev --port ${port}`,
    ready: [/> Local:/],
  })
}
