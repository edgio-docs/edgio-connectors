import { join } from 'path'
import { browserAssetOpts } from './router/NuxtRoutes'
import { BuildOptions, DeploymentBuilder } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

const appDir = process.cwd()
const builder = new DeploymentBuilder(appDir)

const SW_SRC = join(process.cwd(), 'sw', 'service-worker.js')
const SW_DEST = join(process.cwd(), '.output', 'public', '_nuxt', 'service-worker.js')

export default async function build(options: BuildOptions) {
  builder.clearPreviousBuildOutput()

  const { skipFramework } = options

  if (!skipFramework) {
    // run the nuxt.js build with --standalone so that dependencies are bundled and the user
    // doesn't need to add them to package.json dependencies, thus keeping the lambda as
    // small as possible.
    let command = 'npx nuxt build --standalone'

    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Nuxt', command, e)
    }

    await builder.buildServiceWorker({
      swSrc: SW_SRC,
      swDest: SW_DEST,
      globDirectory: join(process.cwd(), '.output', 'public'),
      globPatterns: ['_nuxt/*.*'],
    })
  }

  builder
    // nuxt.js client assets (far-future cacheable)
    .addStaticAsset(join(appDir, '.output', 'public', '_nuxt'), undefined, browserAssetOpts)

    // static pages
    .addStaticAsset(join(appDir, '.output', 'public'), undefined, { exclude: ['_nuxt'] })

    // SSR
    .addJSAsset(join(appDir, '.output', 'server'))
    .addJSAsset(join(appDir, '.nuxt', 'dist', 'server'))

  await builder.build()
}
