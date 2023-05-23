/* istanbul ignore file */
import path, { join } from 'path'
import { nodeFileTrace } from '@vercel/nft'
import esImport from '@edgio/core/utils/esImport'
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'
import { getConfig } from '@edgio/core/config'
import { ExtendedConfig } from './types'

const appDir = process.cwd()

export default async function build(options: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()

  // Load astro config
  let config = await esImport(join(appDir, 'astro.config.mjs'))

  // Write file as json to be read in the getAstroConfig
  builder.writeFileSync(join(builder.jsDir, 'astro.config.json'), JSON.stringify(config.default))

  if (!options.skipFramework) {
    const command = 'npx astro build'
    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Astro', command, e)
    }
  }

  await builder.build()

  const edgioConfig = getConfig() as ExtendedConfig
  const appPath = edgioConfig?.astro?.appPath

  // We're done if there's no appPath
  if (!appPath) return

  console.log('> Found appPath inside edgio.config.js.')
  builder.writeFileSync(
    join(builder.jsDir, 'appPath.json'),
    JSON.stringify({ appPath: path.relative(appDir, appPath) })
  )

  console.log('> Bundling dependencies for the appPath:', appPath)

  // Get the node_modules required for running the server on serverless
  const { fileList } = await nodeFileTrace([appPath])
  fileList.forEach(file => builder.copySync(file, join(builder.jsDir, file)))
  console.log('> Done...')
}
