/* istanbul ignore file */
import { join } from 'path'
import { getSanityConfig } from './getSanityConfig'
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

export default async function build(options: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()

  const sanityConfig = getSanityConfig()

  if (sanityConfig?.project?.basePath) {
    if (!sanityConfig.project.basePath.startsWith('/')) {
      console.warn(
        `> The project's basePath doesn't start with a forward slash.\n> Deployment might not work as expected.`
      )
    }
  }

  if (!options.skipFramework) {
    const command = 'npx sanity build dist'
    try {
      await builder.exec(command)
      // Add sanity.json to the build iff the sanity build succeeds
      builder.addJSAsset(join(process.cwd(), 'sanity.json'))
    } catch (e) {
      throw new FrameworkBuildError('Sanity Studio', command, e)
    }
  }

  await builder.build()
}
