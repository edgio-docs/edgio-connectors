/* istanbul ignore file */
import { join } from 'path'
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'
import BuildUtils from './BuildUtils'

const appDir = process.cwd()

export default async function build(options: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()
  const buildUtils = new BuildUtils(builder)

  if (!options.skipFramework) {
    try {
      await builder.exec(buildUtils.buildCommand)
    } catch (e) {
      throw new FrameworkBuildError('Vue', buildUtils.buildCommand, e)
    }
  }

  // needs to be built here to avoid clears from CLIs
  const config = await buildUtils.buildConfig()
  await buildUtils.buildServiceWorker(config.outDir)
  builder.addStaticAsset(join(appDir, config.outDir))
  await builder.build()
}
