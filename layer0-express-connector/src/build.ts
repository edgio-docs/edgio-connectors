import { BuildOptions, DeploymentBuilder } from '@layer0/core/deploy'
import { bundle } from '@layer0/core/deploy/bundle-esbuild'
import { join } from 'path'
import { existsSync } from 'fs'
import { findDefaultAppPath } from './utils'

export default async function build(_options: BuildOptions) {
  const config = require(join(process.cwd(), 'layer0.config.js'))
  const builder = new DeploymentBuilder()
  const appPath = config.express?.appPath || findDefaultAppPath()
  const outfile = join(builder.jsDir, '__express_bundle__.js')

  builder.clearPreviousBuildOutput()

  if (appPath) {
    if (!existsSync(appPath)) {
      throw new Error(
        `file "${appPath}" referenced in express.appPath config of layer0.config.js does not exist.`
      )
    }
    await bundle({ entryPoints: [appPath], outfile })
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
