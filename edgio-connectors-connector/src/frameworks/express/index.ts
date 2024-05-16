import { join, resolve } from 'path'
import ConnectorBuilder from '../../utils/ConnectorBuilder'
import { BundlerType } from '../../utils/types'
import { existsSync } from 'fs'
import {
  findDefaultAppPath,
  warnIfPortUnbound,
  warnExpressServerNotFound,
  getTemplateConfig,
} from './utils'
import { ExtendedConfig } from './types'
import { getNearestUnboundPort, isPortBound } from '@edgio/core/utils/portUtils'

export default new ConnectorBuilder('express')
  .setTemplateConfig(getTemplateConfig())
  .setTemplateRoutes(".static('public')")
  .setBuild(edgioConfig => {
    const appPath = edgioConfig?.express?.appPath || findDefaultAppPath()
    const bundler = edgioConfig?.express?.bundler || BundlerType.ESBUILD

    if (!appPath) {
      throw new Error(
        "Your express app could not be bundled for deployment because no app entry point was found. Please add the path to your express app's main JS file to the express.appPath array in edgio.config.js. For example:\n\n" +
          'module.exports = {\n' +
          '  express: {\n' +
          "    appPath: './src/app.js'\n" +
          '  }\n' +
          '}'
      )
    }

    if (!existsSync(appPath)) {
      throw new Error(
        `file "${appPath}" referenced in express.appPath config of edgio.config.js does not exist.`
      )
    }

    if (!Object.values(BundlerType).includes(bundler)) {
      throw new Error(
        `The bundler "${bundler}" option in express.bundler config of edgio.config.js is not supported.\r\nPossible values are: ${Object.values(
          BundlerType
        ).join(', ')}`
      )
    }

    return {
      bundler,
      entryFile: appPath,
      entryOutputFile: 'index.js',
      addAssets: async builder => {
        if (bundler === BundlerType.ESBUILD) {
          // We need to override any existing package.json file to one with type: commonjs
          builder.writeFileSync(
            join(builder.jsAppDir, 'package.json'),
            JSON.stringify({
              type: 'commonjs',
            })
          )
        }
      },
    }
  })
  .setProd(async (edgioConfig, port) => {
    return {
      serverPath: 'index.js',
      run: async module => {
        try {
          // When the port is occupied,
          // we assume the server started by itself in the exported module.
          if (await isPortBound(port)) {
            return
          }

          module?.listen(port)
        } catch (e) {
          return Promise.reject(e)
        }
      },
    }
  })
  .setDev(edgioConfig => ({
    run: async port => {
      const config = edgioConfig as ExtendedConfig
      const appPath = config?.express?.appPath || findDefaultAppPath()

      if (appPath) {
        // Set the PORT environment variable to the port the server will run on. This needs to happen
        // prior to the import. If the Express server module already calls `app.listen()`, we need the port
        // to be set before the server starts. Otherwise if the module exports the app, we can invoke `app.listen()`
        // with the desired port.
        process.env.PORT = port.toString()

        // We need to use 'import()' with 'file://' prefix here as a workaround for Windows systems.
        let app = await import(/* webpackIgnore: true */ `file://${resolve(appPath)}`)
        // Find the default export
        app = app?.default?.default || app?.default || app

        if (!app) {
          console.error(
            `ERROR: No app was exported from '${appPath}'. Please export an express app instance from this file.`
          )
          process.exit(1)
        }

        if (app.listen) {
          // The server module may automatically start the Express app. We can detect this by checking if the port is bound.
          // If it is, we assume the server started itself and exit early.
          if (await isPortBound(port)) {
            return
          }

          port = (await getNearestUnboundPort(port)) || port

          // This recent port change may be different from the original port passed in. While we are starting the server
          // directly with the port, we should update the environment variable to reflect the new port.
          process.env.PORT = port.toString()

          // Ideally the server module exports an express app and we simply start it on the desired port
          app.listen(port, () => {
            console.log(`Started Express server on port ${port}.`)
          })
        } else {
          // We also allow the server module to start the express app itself. We'll check if the port is used
          // after one second and warn the user if it isn't. I chose not to error out here because who knows what
          // the user is attempting to do when starting the server. Perhaps there is some precompilation work before binding the server
          // that takes longer than a second? Give them the benefit of the doubt but show a warning to be helpful in the
          // event that things aren't working properly.
          warnIfPortUnbound(port, appPath)
        }
      } else {
        warnExpressServerNotFound()
      }
    },
  }))
  .withServerless()
  .toConnector()
