import { join } from 'path'
import { existsSync } from 'fs'
import { loadConfigFromFile } from 'vite'
import nonWebpackRequire from '@edgio/core/utils/nonWebpackRequire'
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

const appDir = process.cwd()

export default async function build(options: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()

  let sanityConfig, method
  const oldSanityPath = join(appDir, 'sanity.json')
  const newSanityPath = join(appDir, 'sanity.config.js')

  if (existsSync(oldSanityPath)) {
    method = 1
    sanityConfig = nonWebpackRequire(oldSanityPath)
  } else if (existsSync(newSanityPath)) {
    method = 2
    sanityConfig = await loadConfigFromFile({ command: 'build', mode: 'production' }, newSanityPath)
  }

  if (method === 1 && sanityConfig?.project?.basePath) {
    if (!sanityConfig.project.basePath.startsWith('/')) {
      console.warn(
        `> The project's basePath doesn't start with a forward slash.\n> Deployment might not work as expected.`
      )
    }
  }

  if (method === 2 && sanityConfig?.basePath) {
    if (!sanityConfig.basePath.startsWith('/')) {
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
      builder.writeFileSync(
        join(builder.jsDir, 'sanity.json'),
        JSON.stringify({ sanityConfig, method })
      )
    } catch (e) {
      throw new FrameworkBuildError('Sanity Studio', command, e)
    }
  }

  await builder.build()
}
