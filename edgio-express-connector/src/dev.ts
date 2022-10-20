import { createDevServer } from '@edgio/core/dev'
import { join } from 'path'
import { findDefaultAppPath } from './utils'
import chalk from 'chalk'
import { isPortBound, getNearestUnboundPort } from './portUtils'

export default function dev() {
  return createDevServer({
    // All console output from your app will be prefixed with this label
    label: 'Express',
    // The command to start your app in dev mode
    run: async port => {
      const config = require(join(process.cwd(), 'edgio.config.js'))

      const appPath = config.express?.appPath || findDefaultAppPath()

      // The user's server module should use this to bind to the correct port
      // @ts-ignore
      process.env.PORT = port

      if (appPath) {
        const app = require(join(appPath))

        if (app.listen) {
          port = (await getNearestUnboundPort(port)) || port

          // Ideally the server module exports an express app and we simply start it on the desired poryt
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
  })
}

/**
 * Outputs a warning if the express server module has not claimed the desired port
 * after one second.
 * @param port The port that express should claim
 * @param appPath The path to the express server module
 */
function warnIfPortUnbound(port: number, appPath: string) {
  setTimeout(async () => {
    const portBound = await isPortBound(port)

    if (!portBound) {
      console.warn(
        `> ${chalk.bold(chalk.yellow('Warning:'))} Express server module loaded from ${chalk.cyan(
          appPath
        )} did not bind to the desired port: ${chalk.cyan(
          port
        )}. Your server should either export an Express app or bind one to the port specified by ${chalk.cyan(
          'process.env.PORT'
        )}.`
      )
    }
  }, 1000)
}

function warnExpressServerNotFound() {
  console.warn(
    `> ${chalk.yellow(
      'Warning:'
    )} Your Express server module could not be found. Add the following to ${chalk.cyan(
      'edgio.config.js'
    )} to specify the path to your Express server module:`
  )
  console.log('')
  console.log('  express: {')
  console.log("    appPath: './path/to/server.js'")
  console.log('  }')
  console.log('')
}
