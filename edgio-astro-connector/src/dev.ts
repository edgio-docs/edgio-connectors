/* istanbul ignore file */
import { join } from 'path'
import { watchFile } from 'fs'
import { createDevServer } from '@edgio/core/dev'
import { DeploymentBuilder } from '@edgio/core/deploy'

const appDir = process.cwd()
const SW_SRC = join(appDir, 'sw', 'service-worker.js')
const SW_DEST = join(appDir, '.edgio', 'temp', 'service-worker.js')

function BUILD_SW() {
  try {
    // Signal that we are in dev mode, this will create an
    // empty manifest from our default serviceWorker template
    new DeploymentBuilder().buildServiceWorker(SW_SRC, SW_DEST, false)
    // eslint-disable-next-line no-empty
  } catch (e) {}
}

export default function () {
  BUILD_SW()
  watchFile(SW_SRC, (curr, prev) => {
    BUILD_SW()
  })
  return createDevServer({
    label: 'Astro',
    command: port => `npx astro dev --port ${port}`,
    ready: [/Local/i],
  })
}
