/* istanbul ignore file */
import { resolve } from 'path'
import createDevServer from '@edgio/core/dev/createDevServer'
import { DeploymentBuilder } from '@edgio/core/deploy'

const appDir = process.cwd()
const SW_SOURCE = resolve(appDir, 'sw', 'service-worker.js')

export default async function dev() {
  await new DeploymentBuilder().watchServiceWorker(SW_SOURCE)

  return createDevServer({
    label: 'Razzle',
    command: () => 'npx razzle start',
    ready: [/> Started on port/i],
  })
}
