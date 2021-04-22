import { DeploymentBuilder } from '@layer0/core/deploy'
import FrameworkBuildError from '@layer0/core/errors/FrameworkBuildError'
import { BuildOptions } from '@layer0/core/deploy'

const appDir = process.cwd()
const builder = new DeploymentBuilder(appDir)

export default async function build(options: BuildOptions) {
  const { skipFramework } = options

  builder.clearPreviousBuildOutput()

  if (!skipFramework) {
    const command = 'npx gatsby build'
    // run the Gatsby build
    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Gatsby', command, e)
    }
  }

  // No need to inject any assets are they are all added by GatsbyRoutes
  // serveStatic statement
  await builder.build()
}
