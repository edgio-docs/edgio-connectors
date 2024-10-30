import { dirname, resolve, join, relative } from 'path'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
  statSync
} from 'fs'
import { spawnSync } from 'child_process';
import {
  NEXT_BUILDTIME_CONFIG_FILE,
  NEXT_RUNTIME_CONFIG_FILE,
  NEXT_CONFIG_HANDLER_FILE,
  NEXT_CONFIG_FILE,
} from '../config/constants'
import { nodeFileTrace } from '@vercel/nft'
import getNextConfig from '../getNextConfig'
import chalk from 'chalk';

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
  protected srcDir: string
  protected srcFile: string
  protected destDir: string
  protected generateSourceMap: boolean
  protected nextConfig?: any

  constructor(
    srcDir: string,
    destDir: string,
    options: {
      nextConfig?: any
      generateSourceMap?: boolean
    } = {}
  ) {
    this.srcDir = srcDir
    this.destDir = destDir

    // Find used next.config file in the project source directory
    const srcFile = [
      join(srcDir, 'next.config.ts'),
      join(srcDir, 'next.config.mjs'),
      join(srcDir, 'next.config.cjs'),
      join(srcDir, 'next.config.js'),
    ].find(existsSync)

    if(!srcFile){
      throw new Error('Next config file not found. Please create next.config.js in the root directory of your project.')
    }

    this.srcFile = srcFile
    this.nextConfig = options.nextConfig
    this.generateSourceMap = options.generateSourceMap ?? true
  }

  /**
   * Returns the list of next.config.js file dependencies
   * such as imported modules, json files, native modules etc...
   * @return
   */
  protected async getDependencies(): Promise<string[]> {
    const { fileList } = await nodeFileTrace([this.srcFile], {
      ts: true,
      base: resolve(this.srcDir)
    })
    return Array.from(fileList)
  }

  /**
   * Copies the dependencies to lambda folder
   * @return
   */
  protected async copyDependencies(dependencies: string[]): Promise<void> {
    for (const srcFile of dependencies) {
      const srcFileRelative = relative(this.srcDir, srcFile)
      const srcFileRelativeDir = dirname(srcFileRelative)
      const destFile = join(this.destDir, srcFileRelative)
      const destFileDir = join(this.destDir, srcFileRelativeDir)
      // Create the directory structure if it does not exist
      if(!existsSync(destFileDir)){
        mkdirSync(destFileDir, { recursive: true })
      }
      // Do not copy the original next.config.js file as dependency of itself
      if(this.srcFile === join(this.srcDir, srcFile)){
        continue
      }
      // Copy only existing files and not symlinks and directories
      if(existsSync(srcFile) && statSync(srcFile).isFile()){
        copyFileSync(srcFile, destFile)
      }
    }
  }

  /**
   * Creates the file with runtime version of next.config.js.
   * This file is same as the original one.
   * @return
   */
  protected async writeRuntimeVersion(): Promise<void> {
    const result = spawnSync(
      'esbuild',
      [
        this.srcFile,
        '--platform=node',
        '--minify',
        '--bundle',
        '--target=es6',
        '--format=cjs',
        ...(this.generateSourceMap ? ['--sourcemap'] : []),
        '--outfile=' + join(this.destDir, NEXT_RUNTIME_CONFIG_FILE),
      ],
      {
        stdio: 'pipe',
        cwd: this.srcDir
      }
    )
    if (result.status !== 0) {
      console.error(chalk.red("> Failed to build next config file (runtime version)"))
      throw new Error(result.stderr.toString())
    }
  }

  /**
   * Creates the file with buildtime version of next.config.js.
   * Thi file captures the next.config.js content at build time.
   * @return
   */
  protected async writeBuildtimeVersion(): Promise<void> {
    this.nextConfig = this.nextConfig || getNextConfig(this.destDir, NEXT_RUNTIME_CONFIG_FILE)

    // All variables in domains config field are resolved during build time but
    // the process.env.EDGIO_IMAGE_OPTIMIZER_HOST is available during runtime.
    // In order to make the next/image optimizer work with assets on S3,
    // we need to replace 'SET_EDGIO_PERMALINK_HOST_HERE' by process.env.EDGIO_PERMALINK_HOST
    // or legacy process.env.EDGIO_IMAGE_OPTIMIZER_HOST when build finish.
    // TODO: Remove EDGIO_IMAGE_OPTIMIZER_HOST here when console-api sets the EDGIO_PERMALINK_HOST env var
    const serverConfigSrc = `module.exports=${JSON.stringify(this.nextConfig)}`.replace(
      /["']SET_EDGIO_PERMALINK_HOST_HERE["']/,
      'process.env.EDGIO_PERMALINK_HOST || process.env.EDGIO_IMAGE_OPTIMIZER_HOST'
    )

    writeFileSync(
      join(this.destDir, NEXT_BUILDTIME_CONFIG_FILE),
      serverConfigSrc
    )
  }

  /**
   * Creates the file with our handler which will return the next config
   * either from captured buildtime version or runtime version.
   * @return
   */
  async writeFinalVersion(): Promise<void> {
    copyFileSync(
      join(__dirname, 'nextConfigHandler.js'),
      join(this.destDir, NEXT_CONFIG_HANDLER_FILE)
    )
    const result = spawnSync(
      'esbuild',
      [
        NEXT_CONFIG_HANDLER_FILE,
        '--platform=node',
        '--target=es6',
        '--bundle',
        '--minify',
        '--format=cjs',
        ...(this.generateSourceMap ? ['--sourcemap'] : []),
        '--outfile=' + NEXT_CONFIG_FILE,
        `--external:./${NEXT_RUNTIME_CONFIG_FILE}`
      ],
      {
        stdio: 'pipe',
        cwd: this.destDir
      }
    )

    if (result.status !== 0) {
      console.error(chalk.red("> Failed to build next config file (final version)"))
      throw new Error(result.stderr.toString())
    }
  }

  /**
   * Executes the build of next config file and bundle nextConfigHandler together with buildtime version of next.config.js.
   * Then clean after ourselves.
   * @return
   */
  async build(): Promise<void> {
    process.stdout.write(`> Building next config... `)
    await this.copyDependencies(await this.getDependencies())
    await this.writeRuntimeVersion()
    await this.writeBuildtimeVersion()
    await this.writeFinalVersion()
    this.cleanAfterBuild()
    process.stdout.write(`done.\r\n`)
  }

  /**
   * Removes the unused files after the build
   * @return
   */
  protected cleanAfterBuild(): void {
    // Handler was replaced by bundled version
    unlinkSync(join(this.destDir, NEXT_CONFIG_HANDLER_FILE))
    // The buildtime version is no longer needed because it's included in bundle
    unlinkSync(join(this.destDir, NEXT_BUILDTIME_CONFIG_FILE))
  }
}
