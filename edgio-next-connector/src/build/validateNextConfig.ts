import getNextConfig from '../getNextConfig'

const chalk = require('chalk')

/**
 * Ensures that next.config.js exists and sets target: 'serverless'.
 * @param {String} appDir The path to Edgio app's root directory
 */
export default function validateNextConfig(appDir: string) {
  let nextConfig = getNextConfig(appDir)

  if (typeof nextConfig === 'function') {
    nextConfig = nextConfig(null, {})
  }

  if (process.env.WITH_EDGIO_APPLIED !== 'true' /* see withEdgio */) {
    console.error(ERROR_MESSAGE)
    process.exit(1)
  }
}

const ERROR_MESSAGE = `${chalk.red(
  'Error:'
)} Next.js is not properly configured for deployment on Edgio. Please add the ${chalk.green(
  'withEdgio()'
)} plugin to next.config.js.
      
For example:
  ${chalk.cyan(`
  const { withEdgio, withServiceWorker } = require('@edgio/next/config')

  module.exports = withEdgio(
    withServiceWorker({
      edgioSourceMaps: true,
      // ...
      // additional Next.js config options here
      // ...
    })
  )`)}

Please update next.config.js file and try again. If that file does not exist, simply add the example above to the root directory of your app.
`
