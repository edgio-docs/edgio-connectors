const { join } = require('path')
const { DeploymentBuilder } = require('@layer0/core/deploy')
const FrameworkBuildError = require('@layer0/core/errors/FrameworkBuildError')

const appDir = process.cwd()
const builder = new DeploymentBuilder(appDir)

module.exports = async function build(options) {
  builder.clearPreviousBuildOutput()
  const { skipFramework } = options

  if (!skipFramework) {
    // run the nuxt.js build with --standalone so that dependencies are bundled and the user
    // doesn't need to add them to package.json dependencies, thus keeping the lambda as
    // small as possible.
    let command = 'npx cross-env NITRO_PRESET=node nuxt build'

    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Nuxt.js', command, e)
    }
  }

  builder.addJSAsset(join(appDir, '.output', 'server'))

  await builder.build()
}