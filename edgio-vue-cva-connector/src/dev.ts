/* istanbul ignore file */
import { createDevServer } from '@edgio/core/dev'
import BuildUtils from './BuildUtils'

export default async function () {
  const buildUtils = new BuildUtils()

  const config = await buildUtils.buildConfig()

  // Build service worker always, internal buildserviceworker handles the process env/variables injection
  buildUtils.buildServiceWorker(config.outDir)

  return createDevServer(buildUtils.devServerConfig)
}
