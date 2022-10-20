import { getOutputPath } from './utils/getBuildPath'
import { read as readPackageJson } from '@edgio/core/utils/packageUtils'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'
import { join } from 'path'
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'

const appDir = process.cwd()
const distDir = join(appDir, 'dist')
const builder = new DeploymentBuilder(appDir)

export default async function build({ skipFramework }: BuildOptions) {
  builder.clearPreviousBuildOutput()

  const pkg = readPackageJson()
  const isSsr = pkg.scripts['build:ssr']

  if (!skipFramework) {
    const command = `npm run build${isSsr ? ':ssr' : ''}`

    // clear dist directory
    builder.emptyDirSync(distDir)

    try {
      // run the build command
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Angular', command, e)
    }
  }

  const assetsPath = getOutputPath('build')
  const serverPath = getOutputPath('server')

  // if this is an SSR build, add the server to the bundle
  if (serverPath) {
    // Include the angular server which is loaded by the prod entrypoint
    builder.addJSAsset(
      join(appDir, serverPath, 'main.js'),
      join('__backends__', 'angular-server.js')
    )
  }

  builder
    // angular.json
    .addJSAsset(join(appDir, 'angular.json'), 'angular.json')
    // browser assets
    .addStaticAsset(join(appDir, assetsPath), '/')
    // Index html required by Universal engine
    .addJSAsset(join(appDir, assetsPath, 'index.html'), join('/', assetsPath, 'index.html'))

  // exclude the prod handler if we're building only static (no SSR)
  await builder.build({ excludeProdEntryPoint: !serverPath })
}
