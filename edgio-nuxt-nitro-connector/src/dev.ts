import { join } from 'path'
import { DeploymentBuilder } from '@edgio/core/deploy'
import createDevServer from '@edgio/core/dev/createDevServer'

const SW_SRC = join(process.cwd(), 'sw', 'service-worker.js')
const SW_DEST = join(process.cwd(), '.output', 'public', '_nuxt', 'service-worker.js')

export default async function dev() {
  const builder = new DeploymentBuilder()
  // Signal that we are in dev mode, this will create an empty manifest
  // from our default serviceWorker template
  builder.buildServiceWorker(SW_SRC, SW_DEST, false)

  return createDevServer({
    label: 'Nuxt',
    command: port => `npx nuxt dev --port ${port}`,
    ready: [/> Local:/],
  })
}
