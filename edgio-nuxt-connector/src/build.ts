import { join } from 'path'
import { CopyOptionsSync } from 'fs-extra'
import validateNuxtConfig from './utils/validateNuxtConfig'
import { validateDependencies } from './utils/updateDependencies'
import { BuildOptions, DeploymentBuilder } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'
import { browserAssetOpts, EDGIO_NUXT_CONFIG_PATH } from './router/NuxtRoutes'

const { loadNuxtConfig } = require('@nuxt/config')
const appDir = process.cwd()
const builder = new DeploymentBuilder(appDir)

export default async function build(options: BuildOptions) {
  builder.clearPreviousBuildOutput()

  const { skipFramework } = options
  const config = await loadNuxtConfig()

  const nuxtDirName = config.buildDir ?? '.nuxt'
  const nuxtDir = join(appDir, nuxtDirName)

  // Nuxt will produce static assets that need to be served by NuxtRoutes if target='static' or the config has a generate block,
  // for example, to generate a 404.html
  const isStatic = config.target === 'static'
  const lambdaAssetCopyOptions: CopyOptionsSync = {}

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
    let command = 'npx nuxt build --standalone'

    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Nuxt.js', command, e)
    }

    if (isStatic) {
      command = 'npx nuxt generate'

      try {
        await builder.exec(command)
      } catch (e) {
        throw new FrameworkBuildError('Nuxt.js', command, e)
      }
    }
  }

  // edgio-nuxt.config.json
  builder.writeFileSync(
    join(builder.jsDir, EDGIO_NUXT_CONFIG_PATH),
    JSON.stringify(await createEdgioNuxtConfig(config))
  )

  builder
    // nuxt.js client assets
    .addStaticAsset(join(appDir, nuxtDirName, 'dist', 'client'), undefined, browserAssetOpts)

    // assets for generated pages
    .addStaticAsset(
      join(appDir, 'dist', '_nuxt'),
      join(nuxtDirName, 'dist', 'client'),
      browserAssetOpts
    )

    // Vue components
    .addJSAsset(join(appDir, nuxtDirName, 'dist', 'server'), undefined, lambdaAssetCopyOptions)

    // Vue components
    .addJSAsset(join(appDir, nuxtDirName, 'routes.json'))

    // Nuxt config
    .addJSAsset(join(appDir, 'nuxt.config.js'))

    // Nuxt config (TS)
    .addJSAsset(join(appDir, 'nuxt.config.ts'))

  if (isStatic) {
    // static pages
    builder.addStaticAsset(join(appDir, 'dist'))
  }

  await builder.build()

  if (getEdgioSourceMapsValue(config) === false) {
    console.log(`> Found edgioSourceMaps set to false`)
    console.log(`> Deleting .map files from lambda folder`)
    builder.deleteMapFiles(builder.jsDir)
  }
}

async function createEdgioNuxtConfig({ buildDir, target, generate }: any) {
  return {
    target,
    buildDir,
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

/**
 * Returns edgioSourceMaps value from Nuxt config
 * @param config NuxtConfig
 * @return The value of edgioSourceMaps option or null when it's missing
 */
function getEdgioSourceMapsValue(config: any): boolean | null {
  let value = null
  ;(config?.buildModules ?? []).forEach((module: any) => {
    if (Array.isArray(module)) {
      const moduleOption = module.find(
        item => typeof item === 'object' && Object.keys(item).includes('edgioSourceMaps')
      )
      if (moduleOption) {
        value = moduleOption.edgioSourceMaps
      }
    }
  })
  return value
}
