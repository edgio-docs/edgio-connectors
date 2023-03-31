/* istanbul ignore file */
import { existsSync } from 'fs'
import path, { join, resolve } from 'path'
import { nodeFileTrace } from '@vercel/nft'
import esImport from '@edgio/core/utils/esImport'
import getProjectType from '@edgio/core/utils/getProjectType'
import nonWebpackRequire from '@edgio/core/utils/nonWebpackRequire'
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

const appDir = process.cwd()
const SW_SOURCE = resolve(appDir, 'sw', 'service-worker.js')
const SW_DEST_FOLDER = resolve(appDir, '.edgio', 'temp')
const SW_DEST = resolve(SW_DEST_FOLDER, 'service-worker.js')

export default async function build(options: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()

  // Load the astro config
  let config = { default: {} }
  try {
    config = await esImport(join(appDir, 'astro.config.mjs'))
  } catch (e) {
    config = { default: {} }
  }

  if (!options.skipFramework) {
    const command = 'npx astro build'
    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Astro', command, e)
    }
  }

  if (existsSync(SW_SOURCE)) {
    console.log('> Building service worker...')
    builder.buildServiceWorker(SW_SOURCE, SW_DEST, false)
    // @ts-ignore
    // Set a flag inside the config to let the prod.ts know
    config['default']['edgio_SW'] = true
  } else {
    console.warn('> sw/service-worker.js not found... skipping.')
  }

  // Write file as json to be read in the getAstroConfig
  builder.writeFileSync(join(builder.jsDir, 'astro.config.json'), JSON.stringify(config.default))

  await builder.build()

  let edgioConfig = {}

  const configAbsPath = [
    join(appDir, 'edgio.config.js'),
    join(appDir, 'edgio.config.ts'),
    join(appDir, 'edgio.config.cjs'),
  ].find(existsSync)

  if (configAbsPath) {
    try {
      edgioConfig = nonWebpackRequire(configAbsPath)
      // eslint-disable-next-line no-empty
    } catch (e) {}
  }

  const appPath = edgioConfig?.astro?.appPath

  if (appPath) {
    // @ts-ignore
    // Set a flag inside the config to let the prod.ts know
    config['default']['appPath'] = path.relative(appDir, appPath)

    // Write file as json to be read in the getAstroConfig
    builder.writeFileSync(join(builder.jsDir, 'astro.config.json'), JSON.stringify(config.default))

    console.log('> Bundling dependencies for the appPath:', appPath)

    // Get the node_modules required for running the server on serverless
    const { fileList } = await nodeFileTrace([appPath])
    fileList.forEach(file => builder.copySync(file, join(builder.jsDir, file)))

    // Add package.json to __backends__/__js__.js to mark type commonjs top level
    if (getProjectType() === 'module') {
      builder.writeFileSync(
        join(builder.jsDir, '__backends__', 'package.json'),
        JSON.stringify({ type: 'commonjs' })
      )
    }

    console.log('> Done...')
  }
}
