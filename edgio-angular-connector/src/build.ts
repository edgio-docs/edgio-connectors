import { join } from 'path'
import { read } from '@edgio/core/utils/packageUtils'
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import { getAngularProject, getOutputPath } from './utils/getBuildPath'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

const appDir = process.cwd()
const builder = new DeploymentBuilder(appDir)

const SW_SRC = join(appDir, 'sw', 'service-worker.js')
const SW_DEST = join(appDir, '.edgio', 'tmp', 'service-worker.js')

export default async function build({ skipFramework }: BuildOptions) {
  builder.clearPreviousBuildOutput()

  const pkg = read('package.json')
  const isSsr = pkg.dependencies['@nguniversal/express-engine']

  if (isSsr) {
    console.log('> Detected Angular Universal.')
  }

  if (!skipFramework) {
    const command = isSsr
      ? `npx ng build && npx ng run ${getAngularProject()}:server`
      : 'npx ng build'

    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Angular', command, e)
    }
  }

  const assetsPath = getOutputPath('build')
  const serverPath = getOutputPath('server')

  // if this is an SSR build, add the server to the bundle
  if (serverPath) {
    console.log('> Found server configuration inside angular.json.')
    console.log('> Using', join(appDir, serverPath, 'main.js'), 'as the entrypoint for serverless.')

    // Include the angular server which is loaded by the prod entrypoint
    builder.addJSAsset(join(appDir, serverPath, 'main.js'), join('angular-server.js'))

    builder
      // angular.json for the app and angularRoutes
      .addJSAsset(join(appDir, 'angular.json'), 'angular.json')
      // Index html required by Universal engine
      .addJSAsset(join(appDir, assetsPath, 'index.html'), join('/', assetsPath, 'index.html'))
  }

  await builder.buildServiceWorker({
    swSrc: SW_SRC,
    swDest: SW_DEST,
  })

  await builder.build()
}
