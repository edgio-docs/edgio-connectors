import { join } from 'path'
import { DeploymentBuilder } from '@edgio/core/deploy'
import createDevServer from '@edgio/core/dev/createDevServer'

const appDir = process.cwd()
const SW_SRC = join(appDir, 'sw', 'service-worker.js')
const SW_DEST = join(appDir, '.edgio', 'tmp', 'service-worker.js')

export default async function dev() {
  await new DeploymentBuilder().watchServiceWorker(SW_SRC, SW_DEST)
  return createDevServer({
    label: 'Astro',
    command: port => `npx astro dev --port ${port}`,
    ready: [/Local/i],
  })
}
