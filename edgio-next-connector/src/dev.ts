/* istanbul ignore file */
import { DeploymentBuilder } from '@edgio/core/deploy'
import createDevServer from '@edgio/core/dev/createDevServer'
import { SERVICE_WORKER_SOURCE_PATH } from './constants'
import { existsSync } from 'fs'
import { join } from 'path'
import { getConfig } from '@edgio/core'
import { ExtendedConfig } from './types'

const edgioConfig = getConfig() as ExtendedConfig

const nextRootDir = process.cwd()
const pagesDir = existsSync(join(nextRootDir, 'src', 'pages'))
  ? join(nextRootDir, 'src', 'pages')
  : join(nextRootDir, 'pages')
const appDir = existsSync(join(nextRootDir, 'src', 'app'))
  ? join(nextRootDir, 'src', 'app')
  : join(nextRootDir, 'app')

// There's no need to reload router when proxyToServerlessByDefault is enabled,
// because we have just one rule in this case.
const dirsToWatch =
  edgioConfig?.next?.proxyToServerlessByDefault === false ? [pagesDir, appDir] : []

export default async function dev() {
  // @ts-ignore
  global.EDGIO_NEXT_APP = require('next')({ dev: true })

  await new DeploymentBuilder().watchServiceWorker(SERVICE_WORKER_SOURCE_PATH)

  return createDevServer({
    label: 'Next',
    command: port => `npx next dev -p ${port}`,
    ready: [/(started server on|ready on|ready in)/i],
    // The whole Router will be reloaded if any of these dirs change.
    reloadOnChangeOf: dirsToWatch,
  })
}
