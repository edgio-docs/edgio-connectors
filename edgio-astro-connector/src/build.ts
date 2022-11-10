/* istanbul ignore file */
import path, { join } from 'path'
import { nodeFileTrace } from '@vercel/nft'
import esImport from '@edgio/core/utils/esImport'
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

export default async function build(options: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()

  // Load the astro config
  const astroConfigFile = join(process.cwd(), 'astro.config.mjs')
  let config = await esImport(astroConfigFile)

  // Write file as json to be read in the getAstroConfig
  builder.writeFileSync(join(process.cwd(), 'astro.config.json'), JSON.stringify(config.default))

  // Copy this file to the lambda
  builder.copySync(
    join(process.cwd(), 'astro.config.json'),
    join(builder.jsDir, 'astro.config.json')
  )

  // Remove the config.json from the project
  builder.removeSync(join(process.cwd(), 'astro.config.json'))

  if (!options.skipFramework) {
    const command = 'npx astro build'
    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Astro', command, e)
    }
  }

  await builder.build()

  const edgioConfig = require(join(process.cwd(), 'edgio.config.js'))
  const appPath = edgioConfig?.astro?.appPath

  if (appPath) {
    console.log('> Found appPath inside edgio.config.js.')

    builder.writeFileSync(
      join(builder.jsDir, 'appPath.json'),
      JSON.stringify({ appPath: path.relative(process.cwd(), appPath) })
    )

    console.log('> Bundling dependencies for the appPath:', appPath)
    // Get the node_modules required for running the server on serverless
    const { fileList } = await nodeFileTrace([appPath])
    fileList.forEach(file => builder.copySync(file, join(builder.jsDir, file)))

    console.log('> Done...')
  }
}
