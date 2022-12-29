import { DeploymentBuilder } from '@edgio/core/deploy'
import { nonWebpackRequire } from '@edgio/core/utils'
import { join } from 'path'
import {
  NEXT_BUILDTIME_CONFIG_FILE,
  NEXT_RUNTIME_CONFIG_FILE,
  NEXT_CONFIG_HANDLER_FILE,
  NEXT_CONFIG_FILE,
} from '../config/constants'
import { nodeFileTrace } from '@vercel/nft'
import getNextConfig from '../getNextConfig'
import getDistDir from '../util/getDistDir'
import fs from 'fs'

/**
 *  NextConfigBuilder creates the buildtime version and runtime version of next.config.js file.
 *  The runtime version is the original version of next.config.js file.
 *
 *  This nextConfigHandler serves Next config.
 *  For performance reason when no publicRuntimeConfig or serverRuntimeConfig property is presented,
 *  only the buildtime version of config is returned, otherwise the runtime version is evaluated
 *  and publicRuntimeConfig and serverRuntimeConfig properties added.
 */
export default class NextConfigBuilder {
  protected builder: DeploymentBuilder
  protected useServerBuild: boolean
  protected generateSourceMap: boolean
  protected distDir: string

  // For performance reason we don't want to trace these dependencies
  // as they will be always added to build
  protected ignoredDependencies = [
    './node_modules/@edgio/next/config/constants.js',
    './node_modules/@edgio/next/config/index.js',

    './node_modules/@edgio/next/index.js',
    './node_modules/@edgio/next/withEdgio.js',
    './node_modules/@edgio/next/withEdgioInternal.js',

    './node_modules/@edgio/next/sw/index.js',
    './node_modules/@edgio/next/sw/withServiceWorker.js',
    './node_modules/@edgio/next/sw/withServiceWorkerInternal.js',

    './node_modules/@edgio/next/util/nextRuntimeConfigExists.js',
  ]

  constructor(
    builder: DeploymentBuilder,
    options: {
      useServerBuild: boolean
      generateSourceMap: boolean
      distDir: string
    }
  ) {
    this.builder = builder
    this.useServerBuild = options.useServerBuild ?? false
    this.generateSourceMap = options.generateSourceMap ?? true
    this.distDir = options.distDir ?? getDistDir()
  }

  /**
   * Returns the list of next.config.js file dependencies
   * @return
   */
  protected async getDependencies(): Promise<string[]> {
    console.log(`> Searching for dependencies of next config file`)
    const { fileList } = await nodeFileTrace(['next.config.js'], {
      ignore: [
        ...this.ignoredDependencies,
        // Do not resolve symlinks to .yalc folder
        ...this.ignoredDependencies.map(file => file.replace('./node_modules/', '.yalc/')),
      ],
    })
    // filter out duplicates
    return [...new Set(fileList)]
  }

  /**
   * Copies the dependencies to lambda folder
   * @return
   */
  protected async copyDependencies(dependencies: string[]): Promise<void> {
    console.log(`> Copying dependencies of next config file`)
    const includedDependencies = [
      // We need to include external dependencies which may customer use
      ...dependencies,
      ...this.ignoredDependencies,
    ]
    includedDependencies.forEach(file => {
      this.builder.copySync(file, join(this.builder.jsDir, file), {
        overwrite: false,
        errorOnExist: false,
        filter: file => fs.lstatSync(file).isFile(),
      })
    })
  }

  /**
   * Creates the file with runtime version of next.config.js.
   * This file is same as the original one.
   * @return
   */
  protected async writeRuntimeVersion(): Promise<void> {
    this.builder.copySync(
      join(process.cwd(), 'next.config.js'),
      join(this.builder.jsDir, NEXT_RUNTIME_CONFIG_FILE)
    )
  }

  /**
   * Creates the file with buildtime version of next.config.js.
   * @return
   */
  protected async writeBuildtimeVersion(): Promise<void> {
    let serverConfig
    if (this.useServerBuild) {
      const loadConfig = nonWebpackRequire('next/dist/server/config').default
      serverConfig = await loadConfig('phase-production-server', process.cwd())
    } else {
      serverConfig = getNextConfig()
    }
    serverConfig.distDir = this.distDir

    let serverConfigSrc = `module.exports=${JSON.stringify(serverConfig)}`

    // All variables in domains config field are resolved during build time but
    // the process.env.EDGIO_IMAGE_OPTIMIZER_HOST is available during runtime.
    // If disableImageOptimizer is set to true, the next/image optimizer is used and
    // we need to replace 'SET_EDGIO_IMAGE_OPTIMIZER_HOST_HERE' by process.env.EDGIO_IMAGE_OPTIMIZER_HOST when build finish to force next/image optimizer to work.
    serverConfigSrc = serverConfigSrc.replace(
      /["']SET_EDGIO_IMAGE_OPTIMIZER_HOST_HERE["']/,
      'process.env.EDGIO_IMAGE_OPTIMIZER_HOST'
    )

    this.builder.writeFileSync(
      join(this.builder.jsDir, NEXT_BUILDTIME_CONFIG_FILE),
      serverConfigSrc
    )
  }

  /**
   * Creates the file with our handler which will return the next config.
   * @return
   */
  async writeHandler(): Promise<void> {
    this.builder.copySync(
      join(__dirname, 'nextConfigHandler.js'),
      join(this.builder.jsDir, NEXT_CONFIG_HANDLER_FILE)
    )
  }

  /**
   * Executes the build of next config file and bundle nextConfigHandler together with buildtime version of next.config.js.
   * Then clean after ourselves.
   * @return
   */
  async build(): Promise<void> {
    await this.copyDependencies(await this.getDependencies())
    await this.writeRuntimeVersion()
    await this.writeBuildtimeVersion()
    await this.writeHandler()

    console.log(`> Building next config file`)
    const buildCommand = `npx esbuild ${NEXT_CONFIG_HANDLER_FILE} --target=es2018 --bundle --minify --platform=node ${
      this.generateSourceMap ? '--sourcemap' : ''
    } --outfile=${NEXT_CONFIG_FILE} --external:./${NEXT_RUNTIME_CONFIG_FILE}`
    await this.builder.exec(buildCommand, { cwd: this.builder.jsDir })
    this.cleanAfterBuild()
  }

  /**
   * Removes the unsed files after the build
   * @return
   */
  protected cleanAfterBuild(): void {
    console.log(`> Cleaning after build of next config file`)
    // Handler was replaced by bundled version
    this.builder.removeSync(join(this.builder.jsDir, NEXT_CONFIG_HANDLER_FILE))
    // The buildtime version is no longer needed because it's included in bundle
    this.builder.removeSync(join(this.builder.jsDir, NEXT_BUILDTIME_CONFIG_FILE))
  }
}
