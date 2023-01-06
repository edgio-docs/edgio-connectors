import { resolve } from 'path'
import { existsSync } from 'fs'
import { createDevServer } from '@edgio/core/dev'
import { DeploymentBuilder } from '@edgio/core/deploy'

const appDir = process.cwd()
const SW_SOURCE = resolve(appDir, 'sw', 'service-worker.js')
const SW_DEST = resolve(appDir, '.edgio', 'sw_temp', 'service-worker.js')

export default function () {
  if (existsSync(SW_SOURCE)) {
    const builder = new DeploymentBuilder()
    console.log('> Building service worker...')
    builder.buildServiceWorker(SW_SOURCE, SW_DEST, false)
  }
  return createDevServer({
    label: 'FastBoot',
    command: port => `npx ember serve --port=${port}`,
    ready: [/Serving on http/i],
  })
}
