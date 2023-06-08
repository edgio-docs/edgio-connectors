import { join } from 'path'
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

const appDir = process.cwd()
const builder = new DeploymentBuilder(appDir)
const SW_SRC = join(process.cwd(), 'sw', 'service-worker.js')
const SW_DEST = join(process.cwd(), '.edgio', 'temp', 'service-worker.js')

export default async function build(options: BuildOptions) {
  builder.clearPreviousBuildOutput()

  if (!options.skipFramework) {
    const command = 'npx react-scripts build'
    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('React CRA', command, e)
    }
  }

  await builder.buildServiceWorker({
    swSrc: SW_SRC,
    swDest: SW_DEST,
  })

  await builder.build()
}
