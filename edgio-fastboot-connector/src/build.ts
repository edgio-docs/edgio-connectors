/* istanbul ignore file */
import globby from 'globby'
import { existsSync } from 'fs'
import { join, resolve } from 'path'
import { BuildOptions, DeploymentBuilder } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

const SW_SOURCE = resolve(process.cwd(), 'sw', 'service-worker.js')
const SW_DEST = resolve(process.cwd(), 'dist', 'service-worker.js')

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

  if (existsSync(SW_SOURCE)) {
    console.log('> Building service worker...')
    builder.buildServiceWorker(SW_SOURCE, SW_DEST, true, {
      globDirectory: join(process.cwd(), 'build', 'static'),
      globPatterns: globby
        .sync(join('**', '*'), { cwd: join(process.cwd(), 'dist', 'assets') })
        .map(file => `/assets/${file}`),
    })
  } else {
    console.warn('> sw/service-worker.js not found... skipping.')
  }

  builder.addJSAsset('dist')

  await builder.build()
}
