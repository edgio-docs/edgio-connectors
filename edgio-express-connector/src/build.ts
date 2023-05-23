import { BuildOptions, DeploymentBuilder } from '@edgio/core/deploy'
import { bundle as bundleWithEsBuild } from '@edgio/core/deploy/bundle-esbuild'
import bundleWithNft from '@edgio/core/deploy/bundle-nft'
import bundleWithNcc from '@edgio/core/deploy/bundle-ncc'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { findDefaultAppPath } from './utils'
import { getConfig } from '@edgio/core/config'
import { ExtendedConfig } from './types'

export default async function build(_options: BuildOptions) {
  const edgioConfig = getConfig() as ExtendedConfig
  const builder = new DeploymentBuilder()
  const appPath = edgioConfig?.express?.appPath || findDefaultAppPath()
  const bundler = edgioConfig?.express?.bundler
  const outDir = join(builder.jsDir)
  const outfile = join(outDir, 'index.js')

  builder.clearPreviousBuildOutput()

  if (!existsSync(builder.jsDir)) {
    mkdirSync(builder.jsDir)
  }

  writeFileSync(join(builder.jsDir, 'package.json'), JSON.stringify({ name: 'app' }), 'utf8')

  // path to portUtils.js file from this module
  const portUtilsPath = 'node_modules/@edgio/express/portUtils.js'
  builder.copySync(join(process.cwd(), portUtilsPath), join(builder.jsDir, portUtilsPath))

  if (appPath) {
    if (!existsSync(appPath)) {
      throw new Error(
        `file "${appPath}" referenced in express.appPath config of edgio.config.js does not exist.`
      )
    }

    if (bundler === '@vercel/nft') {
      await bundleWithNft(appPath, outDir)
    } else if (bundler === '@vercel/ncc') {
      await bundleWithNcc(appPath, outDir)
    } else {
      process.stdout.write('> Bundling your app with esbuild...')
      await bundleWithEsBuild({ entryPoints: [appPath], outfile })
      process.stdout.write(' done.\n')
    }
  } else {
    throw new Error(
      "Your express app could not be bundled for deployment because no app entry point was found. Please add the path to your express app's main JS file to the express.appPath array in edgio.config.js. For example:\n\n" +
        'module.exports = {\n' +
        '  express: {\n' +
        "    appPath: './src/app.js'\n" +
        '  }\n' +
        '}'
    )
  }

  await builder.build()
}
