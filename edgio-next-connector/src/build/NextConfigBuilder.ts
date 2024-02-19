import { DeploymentBuilder } from '@edgio/core/deploy'
import { join } from 'path'
import {
  NEXT_BUILDTIME_CONFIG_FILE,
  NEXT_RUNTIME_CONFIG_FILE,
  NEXT_CONFIG_HANDLER_FILE,
  NEXT_CONFIG_FILE,
} from '../config/constants'
import { nodeFileTrace } from '@vercel/nft'

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
  protected nextConfig: any
  protected generateSourceMap: boolean
  protected nextRootDir: string

  constructor(
    builder: DeploymentBuilder,
    options: {
      nextConfig: any
      generateSourceMap: boolean
      nextRootDir: string
    }
  ) {
    this.builder = builder
    this.nextConfig = options.nextConfig ?? {}
    this.generateSourceMap = options.generateSourceMap ?? true
    this.nextRootDir = options.nextRootDir ?? './'
  }

  /**
   * Returns the list of next.config.js file dependencies
   * @return
   */
  protected async getDependencies(): Promise<string[]> {
    console.log(`> Searching for dependencies of next config file`)
    const { fileList } = await nodeFileTrace([NEXT_CONFIG_FILE])
    return Array.from(fileList)
  }

  /**
   * Copies the dependencies to lambda folder
   * @return
   */
  protected async copyDependencies(dependencies: string[]): Promise<void> {
    console.log(`> Copying dependencies of next config file`)
    dependencies.forEach(file => {
      this.builder.copySync(file, join(this.builder.jsAppDir, this.nextRootDir, file), {
        overwrite: false,
        errorOnExist: false,
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
      join(process.cwd(), NEXT_CONFIG_FILE),
      join(this.builder.jsAppDir, this.nextRootDir, NEXT_RUNTIME_CONFIG_FILE)
    )
  }

  /**
   * Creates the file with buildtime version of next.config.js.
   * @return
   */
  protected async writeBuildtimeVersion(): Promise<void> {
    let serverConfigSrc = `module.exports=${JSON.stringify(this.nextConfig)}`

    // All variables in domains config field are resolved during build time but
    // the process.env.EDGIO_IMAGE_OPTIMIZER_HOST is available during runtime.
    // In order to make the next/image optimizer work with assets on S3,
    // we need to replace 'SET_EDGIO_PERMALINK_HOST_HERE' by process.env.EDGIO_PERMALINK_HOST
    // or legacy process.env.EDGIO_IMAGE_OPTIMIZER_HOST when build finish.
    // TODO: Remove EDGIO_IMAGE_OPTIMIZER_HOST here when console-api is setting EDGIO_PERMALINK_HOST env var
    serverConfigSrc = serverConfigSrc.replace(
      /["']SET_EDGIO_PERMALINK_HOST_HERE["']/,
      'process.env.EDGIO_PERMALINK_HOST || process.env.EDGIO_IMAGE_OPTIMIZER_HOST'
    )

    this.builder.writeFileSync(
      join(this.builder.jsAppDir, this.nextRootDir, NEXT_BUILDTIME_CONFIG_FILE),
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
      join(this.builder.jsAppDir, this.nextRootDir, NEXT_CONFIG_HANDLER_FILE)
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
    await this.builder.exec(buildCommand, { cwd: join(this.builder.jsAppDir, this.nextRootDir) })
    this.cleanAfterBuild()
  }

  /**
   * Removes the unsed files after the build
   * @return
   */
  protected cleanAfterBuild(): void {
    console.log(`> Cleaning after build of next config file`)
    // Handler was replaced by bundled version
    this.builder.removeSync(join(this.builder.jsAppDir, this.nextRootDir, NEXT_CONFIG_HANDLER_FILE))
    // The buildtime version is no longer needed because it's included in bundle
    this.builder.removeSync(
      join(this.builder.jsAppDir, this.nextRootDir, NEXT_BUILDTIME_CONFIG_FILE)
    )
  }
}
