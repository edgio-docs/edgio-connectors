/* istanbul ignore file */
import { join } from 'path'
import { BuildOptions, DeploymentBuilder } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'
import bundle from './bundle'

const appDir = process.cwd()
const buildDir = join(appDir, 'build')
const builder = new DeploymentBuilder(appDir)

export default async function build(options: BuildOptions) {
  const { skipFramework } = options

  builder.clearPreviousBuildOutput()

  if (!skipFramework) {
    const command = 'npx razzle build --noninteractive'
    // clear .next directory
    builder.emptyDirSync(buildDir)

    // run the next.js build
    try {
      await builder.exec(command)
      await bundle(join(builder.jsDir, 'build'))
    } catch (e) {
      throw new FrameworkBuildError('Razzle', command)
    }
  }

  await builder.build()
}
