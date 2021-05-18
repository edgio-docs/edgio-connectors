import { DeploymentBuilder } from '@xdn/core/deploy'
import FrameworkBuildError from '@xdn/core/errors/FrameworkBuildError'
import { BuildOptions } from '@xdn/core/deploy'

const appDir = process.cwd()
const builder = new DeploymentBuilder(appDir)

export default async function build(options: BuildOptions) {
  const { skipFramework } = options

  builder.clearPreviousBuildOutput()

  if (!skipFramework) {
    // run the Gatsby build
    try {
      await builder.exec('npx gatsby build')
    } catch (e) {
      throw new FrameworkBuildError('Gatsby')
    }
  }

  // No need to inject any assets are they are all added by GatsbyRoutes
  // serveStatic statement
  await builder.build()
}
