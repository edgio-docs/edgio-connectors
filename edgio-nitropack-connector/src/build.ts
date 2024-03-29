/* istanbul ignore file */
import { join } from 'path'
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

const appDir = process.cwd()

export default async function build(options: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()

  if (!options.skipFramework) {
    const command = 'npx nitropack build'
    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Nitropack', command, e)
    }
  }

  // SSR folder
  builder.addJSAsset(join(appDir, '.output', 'server'))

  await builder.build()
}
