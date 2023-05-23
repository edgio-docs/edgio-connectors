import { resolve } from 'path'
import { createDevServer } from '@edgio/core/dev'
import { DeploymentBuilder } from '@edgio/core/deploy'

const appDir = process.cwd()
const SW_SOURCE = resolve(appDir, 'sw', 'service-worker.js')

export default async function () {
  await new DeploymentBuilder().watchServiceWorker(SW_SOURCE)

  return createDevServer({
    label: 'Frontity',
    command: port => `npx frontity dev --port=${port}`,
    ready: [/SERVER STARTED/i],
  })
}
