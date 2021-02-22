import { join } from 'path'
import validateNuxtConfig from './utils/validateNuxtConfig'
import { validateDependencies } from './utils/updateDependencies'
import { BuildOptions, DeploymentBuilder } from '@xdn/core/deploy'
import FrameworkBuildError from '@xdn/core/errors/FrameworkBuildError'
import { browserAssetOpts, XDN_NUXT_CONFIG_PATH } from './router/NuxtRoutes'

const { loadNuxtConfig } = require('@nuxt/config')
const appDir = process.cwd()
const builder = new DeploymentBuilder(appDir)
const nuxtDir = join(appDir, '.nuxt')

module.exports = async function build(options: BuildOptions) {
  builder.clearPreviousBuildOutput()

  const { skipFramework } = options
  const config = await loadNuxtConfig()
  const isStatic = config.target === 'static'

  if (!skipFramework) {
    // clear .nuxt directory
    builder.emptyDirSync(nuxtDir)

    // ensure that nuxt.config.js exists and has mode: universal
    await validateNuxtConfig(appDir)

    // ensure the dependencies are defined
    await validateDependencies()

    // run the nuxt.js build with --standalone so that dependencies are bundled and the user
    // doesn't need to add them to package.json dependencies, thus keeping the lambda as
    // small as possible.
    try {
      await builder.exec('npx nuxt build --standalone')

      if (isStatic) {
        await builder.exec('npx nuxt generate')
      }
    } catch (e) {
      throw new FrameworkBuildError('Nuxt.js')
    }
  }

  // xdn-nuxt.config.json
  builder.writeFileSync(
    join(builder.jsDir, XDN_NUXT_CONFIG_PATH),
    JSON.stringify(await createXDNNuxtConfig(config))
  )

  builder
    // nuxt.js client assets
    .addStaticAsset(join(appDir, '.nuxt', 'dist', 'client'), undefined, browserAssetOpts)

    // assets for generated pages
    .addStaticAsset(
      join(appDir, 'dist', '_nuxt'),
      join('.nuxt', 'dist', 'client'),
      browserAssetOpts
    )

    // Vue components
    .addJSAsset(join(appDir, '.nuxt', 'dist', 'server'))

    // Vue components
    .addJSAsset(join(appDir, '.nuxt', 'routes.json'))

    // Nuxt config
    .addJSAsset(join(appDir, 'nuxt.config.js'))

  if (isStatic) {
    // static pages
    builder.addStaticAsset(join(appDir, 'dist'))
  }

  await builder.build()
}

async function createXDNNuxtConfig({ target, generate }: any) {
  return {
    target,
    generate: generate && {
      fallback: generate.fallback,
      exclude: generate.exclude?.map((entry: string | RegExp) => {
        const regex = <RegExp>entry

        if (regex.source) {
          return { type: 'RegExp', value: regex.source }
        } else {
          return { type: 'string', value: entry }
        }
      }),
    },
  }
}
