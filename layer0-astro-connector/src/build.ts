/* istanbul ignore file */
import { DeploymentBuilder, BuildOptions } from '@layer0/core/deploy'
import FrameworkBuildError from '@layer0/core/errors/FrameworkBuildError'

export default async function build(options: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()

  if (!options.skipFramework) {
    const command = 'npx astro build'
    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Astro', command, e)
    }
  }

  await builder.build()
}
