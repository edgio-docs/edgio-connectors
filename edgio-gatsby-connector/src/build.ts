import { BuildOptions } from '@edgio/core/deploy'
import { DeploymentBuilder } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

const appDir = process.cwd()
const builder = new DeploymentBuilder(appDir)

export default async function build(options: BuildOptions) {
  const { skipFramework } = options

  builder.clearPreviousBuildOutput()

  if (!skipFramework) {
    const command = 'npx gatsby build'
    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Gatsby', command, e)
    }
  }

  await builder.build()
}
