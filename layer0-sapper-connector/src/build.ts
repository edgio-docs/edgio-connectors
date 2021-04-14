/* istanbul ignore file */
import { join } from 'path'
import { BuildOptions, DeploymentBuilder } from '@layer0/core/deploy'
import SapperRoutes from './router/SapperRoutes'
import PluginBase from '@layer0/core/plugins/PluginBase'
import { writeFileSync, mkdirSync } from 'fs'
import FrameworkBuildError from '@layer0/core/errors/FrameworkBuildError'

const appDir = process.cwd()
const sapperDir = join(appDir, '__sapper__')
const builder = new DeploymentBuilder(appDir)

export default async function build(options: BuildOptions) {
  const { skipFramework } = options

  builder.clearPreviousBuildOutput()

  if (!skipFramework) {
    // clear .next directory
    builder.emptyDirSync(sapperDir)

    // run the next.js build
    try {
      await builder.exec('npx sapper build')
    } catch (e) {
      throw new FrameworkBuildError('Sapper')
    }
  }

  const router = await builder.getRouter()
  const plugin = <unknown>router.getPlugins().find((plugin: PluginBase) => SapperRoutes.is(plugin))
  const sapperRoutes = <SapperRoutes>plugin

  if (sapperRoutes) {
    writeFileSync(
      join(builder.jsDir, 'pages-manifest.json'),
      JSON.stringify(sapperRoutes.pagesManifest),
      'utf8'
    )
  }

  builder
    // browser assets
    .addStaticAsset(
      join(appDir, '__sapper__', 'build', 'client'),
      join('__sapper__', 'build', 'client')
    )

    // sapper server bundle
    .addJSAsset(
      join(appDir, '__sapper__', 'build', 'server'),
      join('__sapper__', 'build', 'server')
    )
    .addJSAsset(
      join(appDir, '__sapper__', 'build', 'build.json'),
      join('__sapper__', 'build', 'build.json')
    )
    .addJSAsset(
      join(appDir, '__sapper__', 'build', 'template.html'),
      join('__sapper__', 'build', 'template.html')
    )
    // the service worker needs to be present in the lambda as well because
    // sapper specifically checks the file system for its presence before
    // deciding to register it in the browser
    .addJSAsset(
      join(appDir, '__sapper__', 'build', 'service-worker.js'),
      join('__sapper__', 'build', 'service-worker.js')
    )

  // Sapper will fail at startup if the static dir isn't present.
  // We just put an empty one there since we serve static files from S3
  mkdirSync(join(builder.jsDir, 'static'))
  writeFileSync(join(builder.jsDir, 'static', '.keep'), '', 'utf8')

  await builder.build()
}
