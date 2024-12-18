/* istanbul ignore file */
import { DeploymentBuilder } from '@edgio/core/deploy'
import createDevServer from '@edgio/core/dev/createDevServer'
import { SERVICE_WORKER_SOURCE_PATH } from './constants'
import { existsSync } from 'fs'
import { relative, resolve } from 'path'
import { getConfig } from '@edgio/core'
import { ExtendedConfig } from './types'
import getNextVersion from './util/getNextVersion'
import getNodeOptions from './util/getNodeOptions'
import NextConfigBuilder from './build/NextConfigBuilder'
import { JS_APP_DIR } from '@edgio/core/deploy/paths'
import { findMonorepoRoot } from '@edgio/core/utils/monorepoUtils'
import * as process from 'node:process'

const edgioConfig = getConfig() as ExtendedConfig
const turbopack = edgioConfig?.next?.turbopack ?? false
const nextVersion = getNextVersion()

const monorepoRoot = findMonorepoRoot() || process.cwd()
const nextRootDir = relative(monorepoRoot, process.cwd())
const pagesDir = existsSync(resolve('src', 'pages')) ? resolve('src', 'pages') : resolve('pages')
const appDir = existsSync(resolve('src', 'app')) ? resolve('src', 'app') : resolve('app')

// There's no need to reload router when proxyToServerlessByDefault is enabled,
// because we have just one rule in this case.
const dirsToWatch =
  edgioConfig?.proxyToServerlessByDefault === false ||
  edgioConfig?.next?.proxyToServerlessByDefault === false
    ? [pagesDir, appDir]
    : []

export default async function dev() {
  // @ts-ignore
  global.EDGIO_NEXT_APP = require('next')({ dev: true })

  // Build next.config.js file, so we can later load it in NextRoutes.
  // NOTE: Next.config can be for example Typescript file, so that's why.
  await new NextConfigBuilder(process.cwd(), resolve(JS_APP_DIR), {
    nextRootDir,
    skipNodeModules: true,
  }).build()
  await new DeploymentBuilder().watchServiceWorker(SERVICE_WORKER_SOURCE_PATH)

  return createDevServer({
    label: 'Next',
    command: port => `npx next dev -p ${port} ${turbopack ? '--turbopack' : ''}`,
    env: {
      // We need to add these special NODE_OPTIONS to the build command
      // as a workaround for Next.js 10 and older versions on Node 18.
      // Otherwise, the dev server fails with error: "error:0308010C:digital envelope routines::unsupported"
      NODE_OPTIONS: getNodeOptions(nextVersion || '0.0.0'),
    },
    ready: [/(started server on|ready on|ready in)/i],
    // The whole Router will be reloaded if any of these dirs change.
    reloadOnChangeOf: dirsToWatch,
  })
}
