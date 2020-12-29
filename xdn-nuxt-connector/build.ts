import { join } from 'path'
import validateNuxtConfig from './utils/validateNuxtConfig'
import { BuildOptions, DeploymentBuilder } from '@xdn/core/deploy'
import FrameworkBuildError from '@xdn/core/errors/FrameworkBuildError'

const appDir = process.cwd()
const builder = new DeploymentBuilder(appDir)
const nuxtDir = join(appDir, '.nuxt')

module.exports = async function build(options: BuildOptions) {
  const { skipFramework } = options
  builder.clearPreviousBuildOutput()

  if (!skipFramework) {
    // clear .nuxt directory
    builder.emptyDirSync(nuxtDir)

    // ensure that nuxt.config.js exists and has mode: universal
    await validateNuxtConfig(appDir)

    // run the nuxt.js build with --standalone so that dependencies are bundled and the user
    // doesn't need to add them to package.json dependencies, thus keeping the lambda as
    // small as possible.
    try {
      await builder.exec('npx nuxt build --standalone')
    } catch (e) {
      throw new FrameworkBuildError('Nuxt.js')
    }
  }

  builder
    // nuxt.js client assets
    .addStaticAsset(join(appDir, '.nuxt', 'dist', 'client'), join('.nuxt', 'dist', 'client'))

    // Vue components
    .addJSAsset(join(appDir, '.nuxt', 'dist', 'server'), join('.nuxt', 'dist', 'server'))

    // Vue components
    .addJSAsset(join(appDir, '.nuxt', 'routes.json'), join('.nuxt', 'routes.json'))

    // Nuxt config
    .addJSAsset(join(appDir, 'nuxt.config.js'), 'nuxt.config.js')

  await builder.build()
}
