import { join } from 'path'
import { BuildOptions, DeploymentBuilder } from '@layer0/core/deploy'
import FrameworkBuildError from '@layer0/core/errors/FrameworkBuildError'
import { browserAssetOpts } from './router/NuxtRoutes'
import { buildServiceWorker } from './utils/buildServiceWorker'

const appDir = process.cwd()
const builder = new DeploymentBuilder(appDir)

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

    // call this in this block, as it doesn't make sense to
    // create again the same manifest if it is not rebuilt by
    // Nuxt, or even incorrect one, as Nuxt folder could be
    // deleted and manifest could be empty then
    buildServiceWorker()
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
