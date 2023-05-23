import globby from 'globby'
import { join, resolve } from 'path'
import { BuildOptions, DeploymentBuilder } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

const appDir = process.cwd()
const SW_SOURCE = resolve(appDir, 'sw', 'service-worker.js')
const SW_DEST = resolve(appDir, '.edgio', 's3', 'service-worker.js')

module.exports = async function build(options: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()

  if (!options.skipFramework) {
    const command = 'npx frontity build'
    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Frontity', command, e)
    }
  }

  // Add server.js to the lambda
  builder.addJSAsset(join(appDir, 'build', 'server.js'))

  const frontifyStaticDirectory = join(appDir, 'build', 'static')

  await builder.buildServiceWorker({
    swSrc: SW_SOURCE,
    swDest: SW_DEST,
    globDirectory: frontifyStaticDirectory,
    globPatterns: globby
      .sync(join('**', '*'), { cwd: frontifyStaticDirectory })
      .map(file => `/static/${file}`),
  })

  await builder.build()
}
