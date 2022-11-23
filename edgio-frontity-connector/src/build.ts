/* istanbul ignore file */
import webpack from 'webpack'
import { join, resolve } from 'path'
import { existsSync, unlinkSync } from 'fs'
import createWebpackConfig from './createWebpackConfig'
import { BuildOptions, DeploymentBuilder } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

const SW_SOURCE = resolve(process.cwd(), 'sw', 'service-worker.js')

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

  builder.addJSAsset(join(process.cwd(), 'build', 'server.js'))

  if (existsSync(SW_SOURCE)) {
    console.log('> Building service worker...')
    await buildServiceWorker()
    unlinkSync(resolve(process.cwd(), 'build', '__delete_me__.js'))
  } else {
    console.warn('> sw/service-worker.js not found... skipping.')
  }

  await builder.build()
}

function buildServiceWorker() {
  return new Promise<void>((resolve, reject) => {
    webpack(
      createWebpackConfig({
        mode: 'production',
        entry: {
          __delete_me__: join(__dirname, 'blankWebpackEntry.js'),
        },
      }),
      (err, stats) => {
        if (err) {
          return reject(err)
        }

        if (stats) {
          const { warnings, errors } = stats.toJson()
          warnings.forEach((item: any) => console.warn(item.message || item))
          errors.forEach((item: any) => console.error(item.message || item))

          if (errors.length) {
            console.error(errors)
            return reject(new Error('Build failed.'))
          } else {
            return resolve()
          }
        }
      }
    )
  })
}
