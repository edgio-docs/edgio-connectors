/* istanbul ignore file */
import { DeploymentBuilder } from '@xdn/core/deploy'
import FrameworkBuildError from '@xdn/core/errors/FrameworkBuildError'
import { BuildOptions } from '@xdn/core/deploy'

module.exports = async function build(options: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()

  if (!options.skipFramework) {
    try {
      await builder.exec('npx frontity build')
    } catch (e) {
      throw new FrameworkBuildError('Frontity')
    }
  }

  builder.addJSAsset('build')

  await builder.build()
}
