import globby from 'globby'
import { existsSync } from 'fs'
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
    const command = 'npx ember build --environment=production'
    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('FastBoot', command, e)
    }
  }

  await builder.buildServiceWorker({
    swSrc: SW_SOURCE,
    swDest: SW_DEST,
    globDirectory: join(appDir, 'build', 'static'),
    globPatterns: globby
      .sync(join('**', '*'), { cwd: join(appDir, 'dist', 'assets') })
      .map(file => `/assets/${file}`),
  })

  // Add dist directory containing the server.js to the lambda
  builder.addJSAsset('dist')

  await builder.build()

  if (existsSync(SW_SOURCE)) {
    builder.removeSync(resolve(appDir, '.edgio', 'sw_temp'))
  }
}
