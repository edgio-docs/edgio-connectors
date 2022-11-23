import { join } from 'path'
import { getConfig } from './getConfig'
import esImport from '@edgio/core/utils/esImport'
import { BuildOptions, DeploymentBuilder } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

export default async function build({ skipFramework }: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()

  if (!skipFramework) {
    let command = 'npx gatsby build'

    const edgioConfig = getConfig()
    const gatsbyConfig = getConfig('gatsby-config.js')

    if (gatsbyConfig) {
      builder.writeFileSync(join(builder.jsDir, 'gatsby.config.json'), JSON.stringify(gatsbyConfig))
      builder.writeFileSync(join(builder.jsDir, 'edgio.config.json'), JSON.stringify(edgioConfig))
    }

    if (gatsbyConfig?.pathPrefix) {
      if (edgioConfig?.gatsby?.pathPrefix) {
        // Build the app with the option per https://www.gatsbyjs.com/docs/how-to/previews-deploys-hosting/path-prefix/#build
        command += ' --prefix-paths'
      } else {
        console.warn(
          `> You've set pathPrefix inside gatsby-config.js as "${gatsbyConfig.pathPrefix}".\n> Set gatsby.pathPrefix to true (boolean) inside edgio.config.js to enable serving with path prefix.`
        )
      }
    }

    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Gatsby', command, e)
    }

    if (gatsbyConfig) {
      // Create route maps from the public directory generated
      // Can then safely add fallback to the 404 instead of
      // using static method
      const globby = await (await esImport('globby')).default
      const buildOutputfiles = globby.sync('**/*', {
        cwd: join(process.cwd(), 'public'),
        onlyFiles: true,
      })
      // Create build output routes
      const buildRoutes: string[] = []
      buildOutputfiles.forEach((i: string) => {
        buildRoutes.push(i)
      })
      // write routes to the gatsby config json inside lambda
      builder.writeFileSync(
        join(builder.jsDir, 'gatsby.config.json'),
        JSON.stringify({ ...gatsbyConfig, edgioRoutes: buildRoutes })
      )
    }
  }

  await builder.build()
}
