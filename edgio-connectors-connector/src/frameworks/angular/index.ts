import { join } from 'path'
import ConnectorBuilder from '../../utils/ConnectorBuilder'
import { read } from '@edgio/core/utils/packageUtils'
import { getAngularProject, getOutputPath } from './utils'
import AngularRoutes from './AngularRoutes'

const appDir = process.cwd()

export default new ConnectorBuilder('angular')
  .setBuild((_config, builder) => {
    const pkg = read('package.json')
    const isSsr = pkg.dependencies['@nguniversal/express-engine']

    isSsr && console.log('> Detected Angular Universal.')

    // always add the angular.json file as we need it at runtime
    // to read angular specific configuration
    builder.addJSAsset(join(appDir, 'angular.json'), 'angular.json')

    return {
      command: isSsr ? `npx ng build && npx ng run ${getAngularProject()}:server` : 'npx ng build',
      addAssets: async () => {
        const assetsPath = getOutputPath('build')
        const serverPath = getOutputPath('server')

        // if this is an SSR build, add the server to the bundle
        if (serverPath) {
          console.log('> Found server configuration inside angular.json.')
          console.log(
            '> Using',
            join(appDir, serverPath, 'main.js'),
            'as the entrypoint for serverless.'
          )

          // Include the angular server which is loaded by the prod entrypoint
          builder.addJSAsset(join(appDir, serverPath, 'main.js'), join('angular-server.js'))

          builder
            // Index html required by Universal engine
            .addJSAsset(join(appDir, assetsPath, 'index.html'), join('/', assetsPath, 'index.html'))
        }
      },
    }
  })
  .setProd(async (_config, port) => ({
    serverPath: 'angular-server.js',
    run: async module => new Promise(resolve => module.app().listen(port, resolve)),
  }))
  .setDev({
    command: port => `npx ng serve --port ${port} --host=127.0.0.1`,
    ready: [/compiled successfully|is listening|localhost|127.0.0.1/i],
  })
  .setOnRegister(router => router.use(new AngularRoutes()))
  .withServiceWorker()
  .toConnector()
