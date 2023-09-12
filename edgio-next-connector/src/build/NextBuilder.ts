import globby from 'globby'
import { DeploymentBuilder, BuildOptions, resolveInPackage } from '@edgio/core/deploy'
import { join } from 'path'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'
import nonWebpackRequire from '@edgio/core/utils/nonWebpackRequire'
import validateNextConfig from './validateNextConfig'
import { nodeFileTrace } from '@vercel/nft'
import getNextConfig from '../getNextConfig'
import NextConfigBuilder from './NextConfigBuilder'
import { getConfig } from '@edgio/core/config'
import { lt } from 'semver'
import fs from 'fs'
import { FAR_FUTURE_TTL, NEXT_PRERENDERED_PAGES_FOLDER } from '../constants'
import { ExtendedConfig, RenderMode, RENDER_MODES } from '../types'
import getNextVersion from '../util/getNextVersion'
import { BuilderOptions } from './BuilderOptions'
import getRenderMode from '../util/getRenderMode'
import getBuildId from '../util/getBuildId'
import { gt } from 'semver'
import chalk from 'chalk'
import { existsSync, appendFileSync } from 'fs'

export default class NextBuilder {
  protected builder: DeploymentBuilder
  protected srcDir: string
  protected distDir: string
  protected srcDirAbsolute: string
  protected distDirAbsolute: string
  protected edgioConfig: ExtendedConfig
  protected nextConfig: any
  protected defaultLocale?: string
  protected buildId?: string
  protected renderMode: RenderMode
  protected prerenderManifest?: any
  protected nextVersion: string | null
  protected buildCommand: string

  constructor({ srcDir, distDir, buildCommand }: BuilderOptions) {
    this.srcDir = srcDir
    this.distDir = distDir
    this.srcDirAbsolute = join(process.cwd(), srcDir)
    this.distDirAbsolute = join(process.cwd(), distDir)
    this.builder = new DeploymentBuilder(process.cwd())
    this.edgioConfig = getConfig() as ExtendedConfig
    this.nextConfig = getNextConfig()
    this.defaultLocale = this.nextConfig.i18n?.defaultLocale
    this.renderMode = getRenderMode(this.nextConfig)
    this.nextVersion = getNextVersion()
    this.buildCommand = buildCommand
  }

  async build(options: BuildOptions) {
    this.builder.clearPreviousBuildOutput()

    if (!options?.skipFramework) {
      await this.buildNextApp()
    }

    if (!this.edgioConfig?.next?.disableServiceWorker) {
      await this.buildServiceWorker()
    }

    // Load information about the app when it's built
    this.buildId = getBuildId(this.distDirAbsolute) || 'dev'
    this.prerenderManifest = this.getPrerenderManifest()

    // Add Next.js runtime assets
    if (this.renderMode === RENDER_MODES.server) {
      console.log('> Using Next standalone build...')
      await this.addStandaloneBuildAssets()
    } else {
      console.log(`> Using Next ${this.nextConfig.target} build...`)
      await this.addLegacyBuildAssets()
    }

    // builds the next.config.js file and add our config file handler
    const nextConfigBuilder = new NextConfigBuilder(this.builder, {
      useServerBuild: this.renderMode === RENDER_MODES.server,
      generateSourceMap: this.edgioConfig?.next?.generateSourceMaps ?? true,
      distDir: this.distDir,
    })
    await nextConfigBuilder.build()

    // Add prerendered pages from pages folder to s3
    this.addSSGPages(
      join(this.distDirAbsolute, this.renderMode, 'pages'),
      NEXT_PRERENDERED_PAGES_FOLDER
    )
    // Add prerendered pages from app folder to s3
    this.addSSGPages(
      join(this.distDirAbsolute, this.renderMode, 'app'),
      NEXT_PRERENDERED_PAGES_FOLDER
    )

    await this.builder
      .addJSAsset(join(this.distDirAbsolute, 'BUILD_ID')) // needed for NextRoutes
      .addJSAsset(join(this.distDirAbsolute, 'routes-manifest.json')) // needed for rewrites and redirects
      .addJSAsset(join(this.distDirAbsolute, 'prerender-manifest.json')) // needed for cache times
      .build()

    // This is temporary workaround for a bug in latest versions of Next.js 13,
    // so the customers don't see 500 errors right after playing with new create-next-app project.
    // https://github.com/vercel/next.js/issues/49169
    // TODO: EDGSITES-356 - Remove this temporary fix for Next.js when it's no longer needed
    const foundAppFolder =
      existsSync(join(this.srcDirAbsolute, 'app')) ||
      existsSync(join(this.srcDirAbsolute, 'src', 'app'))
    if (this.nextVersion && gt(this.nextVersion, '13.4.0') && foundAppFolder) {
      // Setting __NEXT_PRIVATE_PREBUNDLED_REACT to 'next' or any other value
      // forces Next.js to use the prebundled React version. When this env var is not set, Next.js will use the React version from node_modules.
      appendFileSync(
        join(this.builder.jsAppDir, '.env.production'),
        `\r\n# Variables below were automatically added by edgio build\r\n__NEXT_PRIVATE_PREBUNDLED_REACT=next\r\n`
      )
      console.log(
        chalk.grey(
          `[Edgio] Adding env variable to .env.production file: __NEXT_PRIVATE_PREBUNDLED_REACT=next`
        )
      )
    }

    // Build optimizations for server build on Next 12, until Next13
    if (
      this.renderMode === RENDER_MODES.server &&
      this.nextVersion &&
      lt(this.nextVersion, '13.0.0')
    ) {
      await this.optimizeAndCompileServerBuild()
    }

    if (this.edgioConfig?.next?.generateSourceMaps === false) {
      console.log(
        `[Edgio] Found generateSourceMaps set to false. Deleting .map files from lambda folder`
      )
      this.builder.deleteMapFiles(this.builder.jsAppDir)
    }

    if (this.renderMode === RENDER_MODES.serverless && this.nextConfig?.rewrites) {
      console.warn(
        `[Edgio] ${chalk.yellow(
          "Warning: The rewrites from 'next.config.js' are currently not fully supported with the Next.js serverless build.\r\nPlease use the server build instead or upgrade to Next.js 12 and newer."
        )}`
      )
    }
  }

  getPrerenderManifest() {
    return nonWebpackRequire(join(this.distDirAbsolute, 'prerender-manifest.json'))
  }

  /**
   * There is an issue with Next12 where their server source code is not bundled into single file.
   * This leads to very long cold starts on the platform ~5s+, with bundling everything into single
   * we are able to get under ~1s load time from the Lambda disk.
   * We are not seeing these problems with Next 13
   *
   * @param builder
   */
  async optimizeAndCompileServerBuild() {
    const nextServerFile = 'next-server.js'
    const outputFile = 'next-server-optimized.js'

    const nextPackageJson = require(resolveInPackage('next', 'package.json'))

    // Dependencies from the next server which we don't want to bundle
    const externalDependencies = [
      ...Object.keys(nextPackageJson.dependencies ?? {}),
      ...Object.keys(nextPackageJson.peerDependencies ?? {}),
      // these files contain global variables which are set
      // and then loaded by other files in next folder
      '../shared/lib/runtime-config.js',
      './router',
      // Next 12
      'critters',
      'next/dist/compiled/@edge-runtime/primitives/*',
      // Anything which is used for SSR rendering can't be easily bundled
      'styled-jsx',
      'react',
      'react-dom',
      'render',
      './render',
      // We have disabled optimizations for next 13 as the perf seems to be OK
      // Next 13
      // './initialize-require-hook',
      // 'webpack',
      // '*require-hook',
      // '*bundle5',
    ]

    const buildCommand = `npx esbuild ${nextServerFile} --target=es2018 --bundle --minify --platform=node --allow-overwrite --outfile=${outputFile} ${externalDependencies
      .map(l => `--external:${l}`)
      .join(' ')}`
    const nextSourceFiles = join(this.builder.jsAppDir, 'node_modules', 'next', 'dist', 'server')

    await this.builder.exec(buildCommand, { cwd: nextSourceFiles })
  }

  /**
   * Builds the Next app using the Next CLI
   */
  async buildNextApp() {
    // clear .next directory
    this.builder.emptyDirSync(this.distDir)
    validateNextConfig(this.srcDir)

    try {
      // run the next.js build
      await this.builder.exec(this.buildCommand)
    } catch (e) {
      throw new FrameworkBuildError('Next.js', this.buildCommand, e)
    }
  }

  /**
   * Copies the output of the Next standalone build to the lambda dir.
   */
  async addStandaloneBuildAssets() {
    // add the next config
    const loadConfig = nonWebpackRequire('next/dist/server/config').default
    const serverConfig = await loadConfig('phase-production-server', process.cwd())
    let serverConfigSrc = `module.exports=${JSON.stringify(serverConfig)}`

    // All variables in domains config field are resolved during build time but
    // the process.env.EDGIO_IMAGE_OPTIMIZER_HOST is available during runtime.
    // If disableImageOptimizer is set to true, the next/image optimizer is used and
    // we need to replace 'SET_EDGIO_IMAGE_OPTIMIZER_HOST_HERE' by process.env.EDGIO_IMAGE_OPTIMIZER_HOST when build finish to force next/image optimizer to work.
    serverConfigSrc = serverConfigSrc.replace(
      /["']SET_EDGIO_IMAGE_OPTIMIZER_HOST_HERE["']/,
      'process.env.EDGIO_IMAGE_OPTIMIZER_HOST'
    )

    this.builder.writeFileSync(join(this.builder.jsAppDir, 'next.config.js'), serverConfigSrc)

    // add the standalone app and dependencies
    this.builder.copySync(join(this.distDirAbsolute, 'standalone'), this.builder.jsAppDir, {
      // exclude the server.js since we roll our own in prod.ts
      filter: (file: string) => file !== join(this.distDirAbsolute, 'standalone', 'server.js'),
    })
  }

  /**
   * Handles bundling the lambda for Next.js prior to 12.2.0. This includes both 'serverless' and 'experimental-serverless-trace'
   * targets.
   */
  async addLegacyBuildAssets() {
    const pagesDir = join(this.builder.jsAppDir, this.distDir, this.renderMode, 'pages')
    this.builder
      // React components and api endpoints
      .addJSAsset(join(this.distDir, this.renderMode))

      // write a minimal next.config.js to the lambda so that we can find the path to static assets in the cloud
      .writeFileSync(
        join(this.builder.jsAppDir, 'next.config.js'),
        `module.exports=${JSON.stringify({ distDir: this.distDir })}`
      )

    if (this.nextConfig?.target !== 'serverless') {
      // If the user has overridden the default target and is using serverless do not perform tracing for required node modules
      const pageHandlerFiles = globby
        .sync('**/*.js', {
          onlyFiles: true,
          cwd: pagesDir,
        })
        .map(file => {
          const src = join(pagesDir, file)
          return src
        })

      const { fileList } = await nodeFileTrace(pageHandlerFiles)

      fileList
        .filter(file => file.indexOf('node_modules') === 0)
        .forEach(file => this.builder.copySync(file, join(this.builder.buildDir, 'lambda', file)))
    }

    const disableImageOptimizer = this.edgioConfig?.next?.disableImageOptimizer || false
    if (disableImageOptimizer) {
      console.warn(
        "[Edgio] Warning: This build target doesn't contain next image optimizer. All images will be unoptimized when Edgio image optimizer is disabled and other optimizer is not provided."
      )
    }
  }

  /**
   * Move all static pages from the lambda dir to the s3 dir. We don't need them in the lambda
   * since we're serving them from s3. so that @edgio/core doesn't.  Also, having them be present
   * in the lambda will make NextRoutes add duplicate routes for each.
   */
  addSSGPages(srcDir: string, destDir: string) {
    if (!fs.existsSync(srcDir)) return
    this.builder.log(`Adding SSG pages from ${srcDir}`)
    const basePath = this.nextConfig?.basePath || ''

    // Add SSG pages with normalized paths
    // e.g. /path/to/page/index.html and /path/to/page/index.json
    globby
      .sync('**/*.{json,html}', {
        onlyFiles: true,
        ignore: ['**/*.nft.json'],
        cwd: srcDir,
      })
      .forEach(file => {
        // Indicate where to store HTML prerendered pages.
        // The HTML files on s3 and JSON data routes on s3-permanent
        const usePermanentOrigin = Boolean(file.match(/\.(json)$/))

        // Load the TTL from prerender-manifest.json
        const key = '/' + file.replace(/\.(html|json)$/, '')
        const metadata = this.prerenderManifest.routes[key]

        const src = join(srcDir, file)
        let dest = file

        // For non-index HTML files, create a directory with the same name as the file
        // and index inside it. Index files are a special case.
        // The path "/" should map to "/index.html", not "/index/index.html"
        if (!file.match(/index\.(html)$/)) {
          dest = file.replace(/\.(html)$/, '/index.$1')
        }
        // For data route JSON files, recreate the file structure on S3 which matches the route
        if (file.match(/\.(json)$/)) {
          dest = join(`/_next/data/${this.buildId}`, dest)
        }

        // Construct the destination path
        dest = join(destDir, basePath, dest)
        // Copy the file to the destination
        this.builder.addStaticAsset(src, dest, {
          permanent: usePermanentOrigin,
        })

        // Set setStaticAssetExpiration for the asset
        if (metadata?.initialRevalidateSeconds) {
          this.builder.log(
            `Setting TTL of ${metadata.initialRevalidateSeconds} seconds for ${dest}`
          )
          this.builder.setStaticAssetExpiration(
            dest,
            metadata.initialRevalidateSeconds,
            FAR_FUTURE_TTL
          )
        }

        // When there's no localization, we're done
        if (!this?.defaultLocale) return

        // Otherwise we need to copy the file also to destination without the default locale in name
        // Change name: /_next/data/mCanuE3de0mPH1u47pDch/en-US.json => /_next/data/mCanuE3de0mPH1u47pDch/index.json
        dest = dest.replace(new RegExp(`/${this.defaultLocale}.json`), '/index.json')
        // Change name: /en-US/index.html => /index.html
        dest = dest.replace(new RegExp(`/${this.defaultLocale}/`), '/')

        // Copy the file to the destination under new name
        this.builder.addStaticAsset(src, dest, {
          permanent: usePermanentOrigin,
        })

        // Set setStaticAssetExpiration for the copy of asset without the default locale prefix
        if (metadata?.initialRevalidateSeconds) {
          this.builder.log(
            `Setting TTL of ${metadata.initialRevalidateSeconds} seconds for ${dest}`
          )
          this.builder.setStaticAssetExpiration(
            dest,
            metadata.initialRevalidateSeconds,
            FAR_FUTURE_TTL
          )
        }
      })
  }

  private buildServiceWorker() {
    return this.builder.buildServiceWorker({
      swSrc: 'sw/service-worker.js',
      swDest: '.edgio/s3/service-worker.js',
      globDirectory: '.next',
      globPatterns: ['static/**/*'],
      modifyURLPrefix: {
        'static/': '/_next/static/',
      },
    })
  }
}
