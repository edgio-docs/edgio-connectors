import { BuildOptions, DeploymentBuilder } from '@layer0/core/deploy'
import { bundle as bundleWithEsBuild } from '@layer0/core/deploy/bundle-esbuild'
import bundleWithNft from '@layer0/core/deploy/bundle-nft'
import bundleWithNcc from '@layer0/core/deploy/bundle-ncc'
import { join } from 'path'
import { existsSync } from 'fs'
import { findDefaultAppPath } from './utils'

export default async function build(_options: BuildOptions) {
  const config = require(join(process.cwd(), 'layer0.config.js'))
  const builder = new DeploymentBuilder()
  const appPath = config.express?.appPath || findDefaultAppPath()
  const bundler = config.express?.bundler
  const outDir = join(builder.jsDir, '__backends__')
  const outfile = join(outDir, 'index.js')

  builder.clearPreviousBuildOutput()

  if (appPath) {
    if (!existsSync(appPath)) {
      throw new Error(
        `file "${appPath}" referenced in express.appPath config of layer0.config.js does not exist.`
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
      "Your express app could not be bundled for deployment because no app entry point was found. Please add the path to your express app's main JS file to the express.appPath array in layer0.config.js. For example:\n\n" +
        'module.exports = {\n' +
        '  express: {\n' +
        "    appPath: './src/app.js'\n" +
        '  }\n' +
        '}'
    )
  }

  await builder.build()
}
