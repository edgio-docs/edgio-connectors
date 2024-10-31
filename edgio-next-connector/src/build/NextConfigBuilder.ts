import { dirname, resolve, join, relative } from 'path'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
  statSync
} from 'fs'
import {
  NEXT_BUILDTIME_CONFIG_FILE,
  NEXT_RUNTIME_CONFIG_FILE,
  NEXT_CONFIG_HANDLER_FILE,
  NEXT_CONFIG_FILE,
} from '../config/constants'
import { nodeFileTrace } from '@vercel/nft'
import getNextConfig from '../getNextConfig'
import chalk from 'chalk';
import spawn from 'cross-spawn'
import { NEXT_ROOT_DIR_FILE } from '../constants'
import { JS_APP_DIR } from '@edgio/core/deploy/paths'

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
  protected nextRootDir: string
  protected fileTracingRootDir: string
  protected skipNodeModules = true

  constructor(
    srcDir: string,
    destDir: string,
    options: {
      nextRootDir?: string
      nextConfig?: any
      generateSourceMap?: boolean
      skipNodeModules?: boolean
    } = {}
  ) {
    this.srcDir = srcDir
    this.destDir = destDir
    this.nextRootDir = options.nextRootDir || './'

    // Get absolute path to the root directory of the project
    // from where dependencies should be traced.
    // For example:
    // srcDir: /repo/packages/next/src
    // destDir: /repo/packages/next/.edgio/lambda/app
    // nextRootDir: packages/next
    // fileTracingRootDir: /repo/
    this.fileTracingRootDir = resolve(
      relative(resolve(this.nextRootDir), this.srcDir)
    )

    // If next.config.js does not have runtime config, we can skip node_modules tracing
    // to save time and space because next.config.runtime.js won't be ever run in lambda.
    const hasRuntimeConfig = options.nextConfig?.serverRuntimeConfig || options.nextConfig?.publicRuntimeConfig
    this.skipNodeModules = options.skipNodeModules ?? !hasRuntimeConfig

    // Find used next.config file in the project source directory
    const srcFile = [
      join(srcDir, 'next.config.ts'),
      join(srcDir, 'next.config.mjs'),
      join(srcDir, 'next.config.cjs'),
      join(srcDir, 'next.config.js'),
    ].find(existsSync)

    if(!srcFile){
      throw new Error('Next config file was not found. Please create next.config.js in the root directory of your project.')
    }

    this.srcFile = srcFile
    this.nextConfig = options.nextConfig
    this.generateSourceMap = options.generateSourceMap ?? true
  }

  /**
   * Returns the list of next.config.js file dependencies
   * such as imported modules, json files, native modules etc...
   * We cannot just bundle them, because some of them might have dynamic imports,
   * ESM syntax not convertible to CJS, etc...
   * and we need to trace them to the root of the project.
   * For example: @next/bundle-analyzer depends on SWC binaries.
   * @return
   */
  protected async getDependencies(): Promise<string[]> {
    const { fileList } = await nodeFileTrace([this.srcFile], {
      // Trace dependencies by default from the same directory as the next.config.js file
      // and if nextRootDir is set, trace dependencies from the nextRootDir directory.
      // For example: ../../
      base: this.fileTracingRootDir,
      processCwd: this.srcDir,
      ts: true,
      // When we build next.config.ts locally just for dev mode,
      // we can skip node_modules tracing to speed up the build.
      ignore: file => this.skipNodeModules && !!file.match(/node_modules|.yalc/),
    })
    return Array.from(fileList)
      // Workaround just for our .yalc symlinks that points to different directories
      .map((file) => file.replace('.yalc', 'node_modules'))
  }

  /**
   * Copies the dependencies to lambda folder
   * @return
   */
  protected async copyDependencies(dependencies: string[]): Promise<void> {
    for (const srcFileRelative of dependencies) {
      const srcFile = join(this.fileTracingRootDir, srcFileRelative)
      const srcFileRelativeDir = dirname(srcFileRelative)
      const destFile = join(this.destDir, srcFileRelative)
      const destFileDir = join(this.destDir, srcFileRelativeDir)

      // Do not copy the original next.config.js file as dependency of itself
      if(this.srcFile === srcFile){
        continue
      }
      // Do not copy directories, non-existing files or symlinks
      if(!existsSync(srcFile) || !statSync(srcFile).isFile()){
        continue
      }

      // Create the directory structure if it does not exist
      if(!existsSync(destFileDir)){
        mkdirSync(destFileDir, { recursive: true })
      }
      copyFileSync(srcFile, destFile)
      // If the dependency is TS file, we need to compile it to JS
      if(destFile.endsWith('.ts')) await this.compileTs(destFile)
    }
  }

  /**
   * Compiles TS dependencies to JS
   */
  protected async compileTs(
    srcFile: string,
  ): Promise<void> {
    const result = spawn.sync(
      'npx',
      [
        'esbuild',
        '--platform=node',
        '--minify',
        '--target=es6',
        '--format=cjs',
        ...(this.generateSourceMap ? ['--sourcemap'] : []),
        '--outfile=' + srcFile.replace(/\.ts$/, '.js'),
        srcFile,
      ],
      {
        stdio: 'pipe',
        cwd: this.srcDir
      }
    )
    if (result.status !== 0) {
      console.error(chalk.red("> Failed to compile Typescript dependency of next config:"))
      console.error(chalk.red(`> Dependency: ${srcFile}`))
      if(result.error) throw result.error
      throw new Error(result.stderr?.toString())
    }
  }

  /**
   * Creates the file with runtime version of next.config.js.
   * This file is same as the original one.
   * @return
   */
  protected async writeRuntimeVersion(): Promise<void> {
    const result = spawn.sync(
      'npx',
      [
        // IMPORTANT: Do not put --bundle flag here,
        // because it will fail on native modules such as @next/bunle-analyzer in most cases.
        'esbuild',
        '--platform=node',
        '--minify',
        '--target=es6',
        '--format=cjs',
        ...(this.generateSourceMap ? ['--sourcemap'] : []),
        '--outfile=' + join(this.destDir, this.nextRootDir, NEXT_RUNTIME_CONFIG_FILE),
        this.srcFile,
      ],
      {
        stdio: 'pipe',
        cwd: this.srcDir
      }
    )
    if (result.status !== 0) {
      console.error(chalk.red("> Failed to build next config file (runtime version)"))
      if(result.error) throw result.error
      throw new Error(result.stderr?.toString())
    }
  }

  /**
   * Creates the file with buildtime version of next.config.js.
   * Thi file captures the next.config.js content at build time.
   * @return
   */
  protected async writeBuildtimeVersion(): Promise<void> {
    this.nextConfig = this.nextConfig || getNextConfig(
      join(this.destDir, this.nextRootDir),
      NEXT_RUNTIME_CONFIG_FILE
    )

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
      join(this.destDir, this.nextRootDir, NEXT_BUILDTIME_CONFIG_FILE),
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
      join(this.destDir, this.nextRootDir, NEXT_CONFIG_HANDLER_FILE)
    )
    const result = spawn.sync(
      'npx',
      [
        'esbuild',
        '--platform=node',
        '--target=es6',
        '--bundle',
        '--minify',
        '--format=cjs',
        ...(this.generateSourceMap ? ['--sourcemap'] : []),
        '--outfile=' + join(this.destDir, this.nextRootDir, NEXT_CONFIG_FILE),
        `--external:./${NEXT_RUNTIME_CONFIG_FILE}`,
        join(this.destDir, this.nextRootDir, NEXT_CONFIG_HANDLER_FILE)
      ],
      {
        stdio: 'pipe',
        cwd: this.destDir
      }
    )

    if (result.status !== 0) {
      console.error(chalk.red("> Failed to build next config file (final version)"))
      if(result.error) throw result.error
      throw new Error(result.stderr?.toString())
    }
  }

  /**
   * Executes the build of next config file and bundle nextConfigHandler together with buildtime version of next.config.js.
   * Then clean after ourselves.
   * @return
   */
  async build(): Promise<void> {
    process.stdout.write(`> Building next config... `)
    this.addNextRootDirFile()

    await this.copyDependencies(await this.getDependencies())
    await this.writeRuntimeVersion()
    await this.writeBuildtimeVersion()
    await this.writeFinalVersion()

    this.cleanAfterBuild()
    process.stdout.write(`done.\r\n`)
  }

  /**
   * Adds file with nextRootDir to the lambda directory,
   * so we know where to look for the next project files, next.config.js etc...
   * This is needed for the projects in NPM/YARN workspaces.
   */
  addNextRootDirFile(){
    mkdirSync(resolve(JS_APP_DIR), { recursive: true })
    writeFileSync(resolve(JS_APP_DIR, NEXT_ROOT_DIR_FILE), this.nextRootDir)
  }

  /**
   * Removes the unused files after the build
   * @return
   */
  protected cleanAfterBuild(): void {
    // Handler was replaced by bundled version
    unlinkSync(join(this.destDir, this.nextRootDir, NEXT_CONFIG_HANDLER_FILE))
    // The buildtime version is no longer needed because it's included in bundle
    unlinkSync(join(this.destDir, this.nextRootDir, NEXT_BUILDTIME_CONFIG_FILE))
  }
}
