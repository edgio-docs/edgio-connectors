import { join } from 'path'
import { BuildOptions, DeploymentBuilder } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'
import nonWebpackRequire from '@edgio/core/utils/nonWebpackRequire'
import fs from 'fs'

export default async function build({ skipFramework }: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()
  const gatsbyConfig = nonWebpackRequire(join(process.cwd(), 'gatsby-config.js'))

  if (gatsbyConfig) {
    // We serialize the JS config output to JSON file,
    // so we don't need to worry about gatsby-config.js dependencies.
    builder.writeFileSync(
      join(builder.jsAppDir, 'gatsby-config.js'),
      `module.exports=${JSON.stringify(gatsbyConfig)}`
    )
  }

  // Copy 404 error page from this connector if it doesn't exist
  if (!fs.existsSync(join(process.cwd(), 'public', '404.html'))) {
    builder.copySync(
      join(__dirname, 'default-app', '404.html'),
      join(process.cwd(), 'public', '404.html')
    )
  }

  if (!skipFramework) {
    let command = 'npx gatsby build'

    if (gatsbyConfig?.pathPrefix) {
      // Build the app with the option per https://www.gatsbyjs.com/docs/how-to/previews-deploys-hosting/path-prefix/#build
      command += ' --prefix-paths'
    }

    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Gatsby', command, e)
    }
  }

  await builder.build()
}
