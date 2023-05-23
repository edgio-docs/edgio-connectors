/* istanbul ignore file */
import { join, resolve } from 'path'
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'
import { PROJECT_TYPES, SERIALIZED_CONFIG_FILE } from './types'
import { getOutputDir, getProjectType } from './utils'

const appDir = process.cwd()
const SW_SOURCE = resolve(appDir, 'sw', 'service-worker.js')
const SW_DEST = resolve(appDir, '.edgio', 's3', 'service-worker.js')
const SERIALIZED_CONFIG_DEST = resolve(appDir, '.edgio', SERIALIZED_CONFIG_FILE)

export default async function build(options: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()

  const projectType = getProjectType()
  const outputDir = await getOutputDir()

  const buildCommand =
    projectType === PROJECT_TYPES.vite ? 'npx vite build' : 'npx vue-cli-service build'
  if (!options.skipFramework) {
    try {
      await builder.exec(buildCommand)
    } catch (e) {
      throw new FrameworkBuildError('Vue', buildCommand, e)
    }
  }

  await builder.buildServiceWorker({
    swSrc: SW_SOURCE,
    swDest: SW_DEST,
    globDirectory: join(appDir, outputDir),
    globPatterns: ['*.*'],
  })

  builder.addStaticAsset(join(appDir, outputDir))

  // We create serialized version of the config file with outputDir.
  // The file relative location is same in both project root and lambda folder
  builder.writeFileSync(SERIALIZED_CONFIG_DEST, JSON.stringify({ outputDir }))
  builder.addJSAsset(SERIALIZED_CONFIG_DEST)

  await builder.build()
}
