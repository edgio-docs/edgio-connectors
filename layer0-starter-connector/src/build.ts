/* istanbul ignore file */
import { BuildOptions, DeploymentBuilder } from '@layer0/core/deploy'
import { emptyDirSync } from 'fs-extra'
import createBuildVersion from './createBuildVersion'
import { resolve } from 'path'
import bundle from './bundle'

const OUTPUT_DIR = resolve(process.cwd(), 'dist')
const appDir = process.cwd()
const builder = new DeploymentBuilder(appDir)

module.exports = async function doBuild(options: BuildOptions) {
  process.stdout.write('> Bundling browser assets... ')
  emptyDirSync(OUTPUT_DIR)
  await bundle()
  process.stdout.write('done.\n')
  builder.clearPreviousBuildOutput()
  await builder.build()
  createBuildVersion()
}
