import { join } from 'path'
import { existsSync } from 'fs'
import bundleWithNcc from '@edgio/core/deploy/bundle-ncc'
import bundleWithNft from '@edgio/core/deploy/bundle-nft'
import { findDefaultAppPath, getEdgioConfig } from './utils'
import getProjectType from '@edgio/core/utils/getProjectType'
import { BuildOptions, DeploymentBuilder } from '@edgio/core/deploy'
import { bundle as bundleWithEsBuild } from '@edgio/core/deploy/bundle-esbuild'

export default async function build(_options: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()

  const config = getEdgioConfig()
  const appPath = config.express?.appPath || findDefaultAppPath()
  const bundler = config.express?.bundler
  const outDir = join(builder.jsDir, '__backends__')
  const outfile = join(outDir, 'index.js')

  builder.writeFileSync(join(builder.jsDir, 'package.json'), JSON.stringify({ name: 'app' }))

  if (getProjectType()) {
    builder.writeFileSync(join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }))
  }

  // path to portUtils.js file from this module
  const portUtilsPath = 'node_modules/@edgio/express/portUtils.js'
  builder.copySync(join(process.cwd(), portUtilsPath), join(builder.jsDir, portUtilsPath))

  if (!appPath) {
    console.error('> No app entry point was found!')
    console.error("> Please update edgio config file to include the path of your app's entrypoint.")
    console.error('> For example:')
    console.error(
      `
      const join = require('path')

      module.exports = {
        express: {
          appPath: join(process.cwd(), 'src', 'app.js')
        }
      }`
    )
  }

  if (!existsSync(appPath)) {
    console.error(`> "${appPath}" referenced in express.appPath does not exist.`)
  }

  if (bundler === '@vercel/nft') {
    await bundleWithNft(appPath, outDir)
  } else if (bundler === '@vercel/ncc') {
    await bundleWithNcc(appPath, outDir)
  } else {
    console.log('> Bundling your app with esbuild...')
    await bundleWithEsBuild({ entryPoints: [appPath], outfile })
    console.log('> Done...')
  }

  await builder.build()
}
