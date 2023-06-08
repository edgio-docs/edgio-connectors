/* istanbul ignore file */
import { join } from 'path'
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

const appDir = process.cwd()
const builder = new DeploymentBuilder(appDir)

const SW_SRC = join(appDir, 'sw', 'service-worker.js')
const SW_DEST = join(appDir, '.edgio', 'tmp', 'service-worker.js')

export default async function build(options: BuildOptions) {
  builder.clearPreviousBuildOutput()
  if (!options.skipFramework) {
    const command = 'npx ng build'
    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('AnalogJS', command, e)
    }
  }
  builder.addJSAsset(join(process.cwd(), 'dist', 'analog', 'server'), 'server')
  await builder.buildServiceWorker({
    swSrc: SW_SRC,
    swDest: SW_DEST,
  })
  await builder.build()
}
