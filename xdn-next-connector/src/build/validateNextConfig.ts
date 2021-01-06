const { join } = require('path')
const chalk = require('chalk')

/**
 * Ensures that next.config.js exists and sets target: 'serverless'.
 * @param {String} appDir The path to the XDN app's root directory
 */
export default function validateNextConfig(appDir: string) {
  const nextConfigPath = join(appDir, 'next.config.js')
  let nextConfig = require(nextConfigPath)

  if (typeof nextConfig === 'function') {
    nextConfig = nextConfig(null, {})
  }

  if (!nextConfig.withXDNApplied /* see withXDN */) {
    console.error(ERROR_MESSAGE)
    process.exit(1)
  }
}

const ERROR_MESSAGE = `${chalk.red(
  'Error:'
)} Next.js is not properly configured for deployment on the Moovweb XDN. Please add the ${chalk.green(
  'withXDN()'
)} plugin to next.config.js.
      
For example:
  ${chalk.green(`
  const { withXDN, withServiceWorker } = require('@xdn/next/config')

  module.exports = withXDN(withServiceWorker({
    // additional Next.js config options here
  }))`)}

Please update next.config.js file and try again. If that file does not exist, simply add the example above to the root directory of your app.
`
