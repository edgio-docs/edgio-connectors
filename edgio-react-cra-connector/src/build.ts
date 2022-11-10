/* istanbul ignore file */
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

export default async function build(options: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()

  if (!options.skipFramework) {
    const command = 'npx react-scripts build'
    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('React CRA', command, e)
    }
  }

  await builder.build()
}
