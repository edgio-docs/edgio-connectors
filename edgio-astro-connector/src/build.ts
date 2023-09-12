/* istanbul ignore file */
import { join, relative } from 'path'
import esImport from '@edgio/core/utils/esImport'
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'
import { getConfig } from '@edgio/core/config'
import { ExtendedConfig } from './types'
import bundleWithNft from '@edgio/core/deploy/bundle-nft'

const appDir = process.cwd()
const builder = new DeploymentBuilder(appDir)

const SW_SRC = join(appDir, 'sw', 'service-worker.js')
const SW_DEST = join(appDir, '.edgio', 'tmp', 'service-worker.js')

export default async function build(options: BuildOptions) {
  builder.clearPreviousBuildOutput()

  // Load astro config
  let config = await esImport(join(appDir, 'astro.config.mjs'))

  // Write file as json to be read in the getAstroConfig
  builder.writeFileSync(join(builder.jsAppDir, 'astro.config.json'), JSON.stringify(config.default))

  if (!options.skipFramework) {
    const command = 'npx astro build'
    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Astro', command, e)
    }
  }

  await builder.buildServiceWorker({
    swSrc: SW_SRC,
    swDest: SW_DEST,
  })

  await builder.build()

  const edgioConfig = getConfig() as ExtendedConfig
  const appPath = edgioConfig?.astro?.appPath

  // We're done if there's no appPath
  if (!appPath) return

  console.log('> Found appPath inside edgio.config.js.')
  builder.writeFileSync(
    join(builder.jsAppDir, 'appPath.json'),
    JSON.stringify({ appPath: relative(appDir, appPath) })
  )

  console.log('> Bundling dependencies for the appPath:', appPath)
  // Trace and copy all dependencies required for running the app
  await bundleWithNft(appPath, builder.jsAppDir, relative(appDir, appPath))

  console.log('> Done...')
}
