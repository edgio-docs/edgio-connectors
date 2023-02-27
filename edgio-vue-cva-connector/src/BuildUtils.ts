import DevServerOptions from '@edgio/core/dev/DevServerOptions'
import path, { join, resolve } from 'path'
import NoCliError from './NoCliError'
import { existsSync } from 'fs'
import nonWebpackRequire from '@edgio/core/utils/nonWebpackRequire'
import { DeploymentBuilder } from '@edgio/core/deploy'
import { VueConfig, VUE_CONFIG_NAME } from './VueConfig'
import { isProductionBuild } from '@edgio/core/environment'

const appDir = process.cwd()

/**
 * Provides a transparent, unified access to cli dependant build utilities.
 */
export default class BuildUtils {
  buildConfig: () => Promise<VueConfig>
  devServerConfig: DevServerOptions
  buildCommand: string
  isWebpackCli: boolean
  builder: any

  constructor(builder = new DeploymentBuilder()) {
    this.builder = builder
    if (this.isViteProject()) {
      this.buildConfig = this.buildViteConfig
      this.devServerConfig = {
        command: port => `npx vite dev --port ${port}`,
      }
      this.buildCommand = 'npx vite build'
      this.isWebpackCli = false
    } else if (this.isCliProject()) {
      this.buildConfig = this.buildCliConfig
      this.devServerConfig = {
        // must be forced to localhost, is otherwise exposed -> this matches vite behaviour
        command: port => `npx vue-cli-service serve --port ${port} --host localhost`,
        filterOutput: line =>
          !/App running at:|Note that the development build is not optimized.|localhost:3001|\n/i.test(
            line
          ),
      }
      this.buildCommand = 'npx vue-cli-service build'
      this.isWebpackCli = true
    } else {
      throw new NoCliError()
    }
    // different vite versions output different format
    this.devServerConfig.ready = [/(localhost|127.0.0.1):/i]
    this.devServerConfig.label = 'Vue 3'
  }

  public isWebpack() {
    return this.isWebpackCli
  }

  public buildServiceWorker(destFolder: string) {
    const SW_SOURCE = resolve(appDir, 'sw', 'service-worker.js')
    const SW_DEST = resolve(appDir, destFolder, 'service-worker.js')

    if (existsSync(SW_SOURCE)) {
      const outDir = path.join(appDir, destFolder)
      process.stdout.write('> Building service worker...')
      isProductionBuild()
        ? this.builder.buildServiceWorker(SW_SOURCE, SW_DEST, true, {
            globDirectory: outDir,
            globPatterns: ['*.*'],
          })
        : this.builder.buildServiceWorker(SW_SOURCE, SW_DEST)
      process.stdout.write(' done.\n')
    } else {
      console.warn('> sw/service-worker.js not found... skipping.')
    }
  }

  private async buildViteConfig() {
    const resolveConfig = require('vite').resolveConfig
    let inputConfig
    let outputDir

    if (isProductionBuild()) {
      process.stdout.write('> Building VITE production config...')
      inputConfig = (await resolveConfig({ mode: 'production' }, 'build', 'production')) ?? {}
      inputConfig.outDir = path.relative(appDir, inputConfig.build?.outDir ?? 'dist')
      outputDir = join(this.builder.jsDir, VUE_CONFIG_NAME)
    } else {
      process.stdout.write('> Building VITE development config...')
      inputConfig = (await resolveConfig({ mode: 'development' }, 'serve', 'development')) ?? {}
      inputConfig.outDir = (inputConfig.outDir ?? 'dist').replace('./', '')
      outputDir = join('.edgio_temp', VUE_CONFIG_NAME)
    }

    const outputConfig = {
      outDir: inputConfig.outDir,
    }
    this.builder.writeFileSync(outputDir, JSON.stringify(outputConfig))
    process.stdout.write(' done.\n')
    return outputConfig
  }

  private async buildCliConfig() {
    const configPath = join(appDir, 'vue.config.js')
    const inputConfig = existsSync(configPath) ? nonWebpackRequire(configPath) : {}
    let outputDir

    if (isProductionBuild()) {
      process.stdout.write('> Building Vue production config...')
      inputConfig.outputDir = path.relative(appDir, inputConfig.outputDir ?? 'dist')
      outputDir = join(this.builder.jsDir, VUE_CONFIG_NAME)
    } else {
      process.stdout.write('> Building Vue development config...')
      inputConfig.outputDir = (inputConfig.outputDir ?? 'dist').replace('./', '')
      outputDir = join('.edgio_temp', VUE_CONFIG_NAME)
    }

    const outputConfig = {
      outDir: inputConfig.outputDir,
    }
    this.builder.writeFileSync(outputDir, JSON.stringify(outputConfig))
    process.stdout.write(' done.\n')
    return outputConfig
  }

  private isViteProject() {
    // we check node modules in order to avoid having to parse package.json
    return existsSync('node_modules/vite')
  }

  private isCliProject() {
    return existsSync('node_modules/@vue/cli-service')
  }
}
