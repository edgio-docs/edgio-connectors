import { join } from 'path'
import { DeploymentBuilder } from '@edgio/core/deploy'
import createDevServer from '@edgio/core/dev/createDevServer'

const SW_SRC = join(process.cwd(), 'sw', 'service-worker.js')
const SW_DEST = join(process.cwd(), '.edgio', 'tmp', 'service-worker.js')

export default async function dev() {
  await new DeploymentBuilder().watchServiceWorker(SW_SRC, SW_DEST)
  return createDevServer({
    label: 'Angular',
    command: port => `npx ng serve --port ${port}`,
    ready: [/compiled successfully/i],
  })
}
