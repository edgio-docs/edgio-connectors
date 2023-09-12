import { join } from 'path'
import { CopyOptionsSync } from 'fs-extra'
import validateNuxtConfig from './utils/validateNuxtConfig'
import { validateDependencies } from './utils/updateDependencies'
import { BuildOptions, DeploymentBuilder } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'
import { browserAssetOpts, EDGIO_NUXT_CONFIG_PATH } from './router/NuxtRoutes'
import { nodeFileTrace } from '@vercel/nft'
import fs from 'fs'

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

    // if static, we dont need to run the build / create a server - the CDN / edgio will serve the files
    const command = isStatic ? 'npx nuxt generate' : 'npx nuxt build --standalone'

    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Nuxt.js', command, e)
    }
  }

  // edgio-nuxt.config.json
  const edgioConfigPath = join(appDir, EDGIO_NUXT_CONFIG_PATH)
  builder.writeFileSync(edgioConfigPath, JSON.stringify(config))
  builder.addJSAsset(edgioConfigPath)

  if (isStatic) {
    // static pages
    builder.addStaticAsset(join(appDir, 'dist'))
  } else {
    builder
      // nuxt.js client assets
      .addStaticAsset(join(appDir, nuxtDirName, 'dist', 'client'), undefined, browserAssetOpts)

      // Vue components
      .addJSAsset(join(appDir, nuxtDirName, 'dist', 'server'), undefined, lambdaAssetCopyOptions)

      // Vue components
      .addJSAsset(join(appDir, nuxtDirName, 'routes.json'))

    // middleware needs to be copied, otherwise we wont have access to it on prod build
    config.serverMiddleware &&
      Object.values(config.serverMiddleware).forEach(value =>
        // we strip tilde, as it means 'root of the application' in this context anyways, and we cant copy otherwise
        builder.addJSAsset(join(appDir, value as string).replace('~/', ''))
      )

    const tsConfigPath = join(appDir, 'nuxt.config.ts')
    // checking to avoid warnings in console
    fs.existsSync(tsConfigPath)
      ? builder.addJSAsset(tsConfigPath)
      : builder.addJSAsset(join(appDir, 'nuxt.config.js'))
  }

  await builder.build()

  if (!isStatic) {
    // Add deps for lambda function to be able to programatically invoke server start
    // not needed for static, as the server isnt needed for it
    const files = ['./node_modules/@nuxt/core/dist/core.js']
    const { fileList } = await nodeFileTrace(files)
    Array.from(fileList)
      .filter(file => file.indexOf('node_modules') === 0)
      .forEach(file => builder.copySync(file, join(builder.buildDir, 'lambda', file)))
  }

  if (getEdgioSourceMapsValue(config) === false) {
    console.log(`> Found edgioSourceMaps set to false`)
    console.log(`> Deleting .map files from lambda folder`)
    builder.deleteMapFiles(builder.jsAppDir)
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
