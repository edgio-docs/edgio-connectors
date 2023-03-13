/* istanbul ignore file */
import { existsSync } from 'fs'
import path, { join } from 'path'
import { nodeFileTrace } from '@vercel/nft'
import esImport from '@edgio/core/utils/esImport'
import getProjectType from '@edgio/core/utils/getProjectType'
import nonWebpackRequire from '@edgio/core/utils/nonWebpackRequire'
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

export default async function build(options: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()

  // Load the astro config
  let config = { default: {} }
  try {
    config = await esImport(join(process.cwd(), 'astro.config.mjs'))
  } catch (e) {
    config = { default: {} }
  }

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

  let edgioConfig = {}

  const configAbsPath = [
    join(process.cwd(), 'edgio.config.js'),
    join(process.cwd(), 'edgio.config.ts'),
    join(process.cwd(), 'edgio.config.cjs'),
  ].find(existsSync)

  if (configAbsPath) {
    try {
      edgioConfig = nonWebpackRequire(configAbsPath)
      // eslint-disable-next-line no-empty
    } catch (e) {}
  }

  const appPath = edgioConfig?.astro?.appPath

  if (appPath) {
    console.log('> Found appPath inside Edgio configuration')

    builder.writeFileSync(
      join(builder.jsDir, 'appPath.json'),
      JSON.stringify({ appPath: path.relative(process.cwd(), appPath) })
    )

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
