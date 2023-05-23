/* istanbul ignore file */
import { join } from 'path'
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

export default async function build(options: BuildOptions) {
  const builder = new DeploymentBuilder()
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
  await builder.build()
}
