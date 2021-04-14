/* istanbul ignore file */
import { BuildOptions, DeploymentBuilder } from '@layer0/core/deploy'
import webpack from 'webpack'
import createWebpackConfig, { OUTPUT_DIR } from './createWebpackConfig'
import chalk from 'chalk'
import { emptyDirSync } from 'fs-extra'
import createBuildVersion from './createBuildVersion'

const appDir = process.cwd()
const builder = new DeploymentBuilder(appDir)

module.exports = async function build(options: BuildOptions) {
  try {
    process.stdout.write('> Bundling browser assets... ')
    emptyDirSync(OUTPUT_DIR)
    await buildWithWebpack()
    process.stdout.write('done.\n')
  } catch (e) {
    console.error(e)
    process.stdout.write(chalk.red('failed.\n'))
    return
  }

  builder.clearPreviousBuildOutput()
  await builder.build()
  createBuildVersion()
}

function buildWithWebpack() {
  return new Promise<void>((resolve, reject) => {
    webpack(createWebpackConfig({ mode: 'production' }), (err, stats) => {
      if (err) {
        reject(err)
      }

      if (stats) {
        const { warnings, errors } = stats.toJson()
        warnings.forEach((item: any) => console.warn(item.message))
        errors.forEach((item: any) => console.error(item.message))

        if (errors.length) {
          reject(new Error('Build failed.'))
        } else {
          resolve()
        }
      }
    })
  })
}
