import { join } from 'path'
import { BuildOptions, DeploymentBuilder } from '@layer0/core/deploy'
import FrameworkBuildError from '@layer0/core/errors/FrameworkBuildError'
import { browserAssetOpts } from './router/NuxtRoutes'
import { CopyOptionsSync } from 'fs-extra'
import validateDependencies from './utils/validateDependencies'

const { loadNuxtConfig } = require('@nuxt/config-edge')
const appDir = process.cwd()
const builder = new DeploymentBuilder(appDir)
const nuxtDir = join(appDir, '.nuxt')

export default async function build(options: BuildOptions) {
  builder.clearPreviousBuildOutput()

  const { skipFramework } = options
  const config = await loadNuxtConfig()

  const layer0BuildModule = config.buildModules.find(
    (module: String | [String, object]) =>
      Array.isArray(module) && module[0] === '@layer0/nuxt/module'
  )

  const layer0SourceMaps = layer0BuildModule && layer0BuildModule[1]?.layer0SourceMaps
  const lambdaAssetCopyOptions: CopyOptionsSync = {}

  // Filter-out source maps from lambda package if not explictely included
  if (!layer0SourceMaps) {
    lambdaAssetCopyOptions.filter = (src: string) => !src.endsWith('.map')
  }

  if (!skipFramework) {
    // clear .nuxt directory
    builder.emptyDirSync(nuxtDir)

    // ensure the dependencies are defined
    await validateDependencies()

    // run the nuxt.js build with --standalone so that dependencies are bundled and the user
    // doesn't need to add them to package.json dependencies, thus keeping the lambda as
    // small as possible.
    let command = 'npx nuxt build --standalone'

    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Nuxt.js', command, e)
    }
  }

  builder
    // nuxt.js client assets (far-future cacheable)
    .addStaticAsset(join(appDir, '.output', 'public', '_nuxt'), undefined, browserAssetOpts)

    // static pages
    .addStaticAsset(join(appDir, '.output', 'public'), undefined, { exclude: ['_nuxt'] })

    // SSR
    .addJSAsset(join(appDir, '.output', 'server'), undefined, lambdaAssetCopyOptions)
    .addJSAsset(join(appDir, '.nuxt', 'routes.json'))

  await builder.build({ layer0SourceMaps })
}
