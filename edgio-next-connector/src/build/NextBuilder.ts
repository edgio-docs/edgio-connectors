import globby from 'globby'
import { DeploymentBuilder, BuildOptions, resolveInPackage } from '@edgio/core/deploy'
import { join, relative } from 'path'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'
import nonWebpackRequire from '@edgio/core/utils/nonWebpackRequire'
import { nodeFileTrace } from '@vercel/nft'
import getNextConfig from '../getNextConfig'
import NextConfigBuilder from './NextConfigBuilder'
import { getConfig } from '@edgio/core/config'
import { lt, gt } from 'semver'
import { FAR_FUTURE_TTL, NEXT_PRERENDERED_PAGES_FOLDER, NEXT_ROOT_DIR_FILE } from '../constants'
import { ExtendedConfig, RenderMode, RENDER_MODES } from '../types'
import getNextVersion from '../util/getNextVersion'
import { BuilderOptions } from './BuilderOptions'
import getRenderMode from '../util/getRenderMode'
import getBuildId from '../util/getBuildId'
import chalk from 'chalk'
import { existsSync, appendFileSync, mkdirSync } from 'fs'
import getNodeOptions from '../util/getNodeOptions'
import { NextConfig, isRewriteGroup } from '../next.types'
import ManifestParser from '../router/ManifestParser'
import brandify from '@edgio/core/utils/brandify'
import { normalizePath } from '@edgio/core/utils/pathUtils'
import { JS_APP_DIR } from '@edgio/core/deploy/paths'
import getDistDir from '../util/getDistDir'

export default class NextBuilder {
  protected builder: DeploymentBuilder
  protected srcDir: string = './'
  protected distDir: string = '.next'
  protected edgioConfig: ExtendedConfig
  protected nextConfig: NextConfig = {}
  protected renderMode: RenderMode = RENDER_MODES.server
  protected defaultLocale?: string
  protected buildId?: string
  protected prerenderManifest?: any
  protected nextVersion?: string | null
  protected buildCommand: string

  constructor({ buildCommand }: BuilderOptions) {
    this.builder = new DeploymentBuilder(process.cwd())
    this.buildCommand = buildCommand
    this.edgioConfig = getConfig() as ExtendedConfig
  }

  protected get srcDirAbsolute() {
    return join(process.cwd(), this.srcDir)
  }

  protected get distDirAbsolute() {
    return join(process.cwd(), this.distDir)
  }

  protected get nextRootDir() {
    // For Next.js <= 14, the outputFileTracingRoot is under experimental config.
    // For Next.js >= 15, the outputFileTracingRoot is under the root config.
    const outputFileTracingRoot = this.nextConfig?.experimental?.outputFileTracingRoot || this.nextConfig?.outputFileTracingRoot || './'
    // When Next.js is built in workspaces or the outputFileTracingRoot config option is explicitly set,
    // the standalone build folder will have different folder structure.
    // This is where we can get the project root folder where the server files are actually placed.
    // We need to normalize the path because node paths are different on Windows and Unix systems.
    return normalizePath(
      relative(outputFileTracingRoot, process.cwd()) || './'
    )
  }

  async build(options: BuildOptions) {
    this.builder.clearPreviousBuildOutput()
    // Load basic information about the app
    // and next config from the source next.config.js file to
    // determine the build mode (server/serverless).
    this.nextConfig = getNextConfig() as NextConfig
    this.renderMode = getRenderMode(this.nextConfig)
    this.nextVersion = getNextVersion()

    // Build the app
    if (!options?.skipFramework) {
      await this.buildNextApp()
    }

    // Build the app's next.config.js file and load it with merged default values from the Next.js server.
    // NOTE: This is necessary if app uses for example TypeScript/ESM with next.config.ts/mjs file,
    if(this.renderMode === RENDER_MODES.server) {
      await this.buildStandaloneNextConfig()
    }else{
      await this.buildServerlessNextConfig()
    }
    // Validate that built next.config it has all required Edgio plugins in it
    this.validateNextConfig()

    // Build the app's service worker
    if (!this.edgioConfig?.next?.disableServiceWorker) {
      await this.buildServiceWorker()
    }

    // When both app and next.config are finally built and loaded,
    // we can load all needed information about the app.
    this.srcDir = './'
    this.distDir = getDistDir(this.nextConfig)
    this.buildId = getBuildId(this.distDirAbsolute) || 'dev'
    this.prerenderManifest = this.getPrerenderManifest()
    this.defaultLocale = this.nextConfig.i18n?.defaultLocale

    // Add Next.js runtime assets
    if (this.renderMode === RENDER_MODES.server) {
      console.log('> Using Next standalone build...')
      await this.addStandaloneBuildAssets()
    } else {
      console.log(`> Using Next ${this.nextConfig.target} build...`)
      await this.addLegacyBuildAssets()
    }

    // Add the file with relative location to the Next.js app.
    // This is needed for Next.js 13 app which is built in workspaces.
    this.builder.writeFileSync(join(this.builder.jsAppDir, NEXT_ROOT_DIR_FILE), this.nextRootDir)

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

    await this.builder.build()

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
        join(this.builder.jsAppDir, this.nextRootDir, '.env.production'),
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

    if (this.nextVersion && lt(this.nextVersion, '12.0.0')) {
      console.warn(
        `[Edgio] ${chalk.yellow(
          'Warning: Next.js 11 and older versions are not officially supported. The support for these older versions via Edgio is experimental, and not all features might work correctly.\r\nWe recommend upgrading your application to Next.js 12 and newer for the best experience.'
        )}`
      )
    }

    // NOTE: We add following remote patterns into the next.config.js file by default:
    // ['SET_EDGIO_PERMALINK_HOST_HERE', '127.0.0.1', 'localhost', '127.0.0.1:3000', 'localhost:3000']
    // That's why we are checking if it has more than 5 remote patterns here.
    // See: /src/plugins/withImageDomainsConfig.ts
    const hasImagesRemotePatterns =
      this.nextConfig?.images?.remotePatterns &&
      this.nextConfig?.images?.remotePatterns?.length > 5
    const hasImagesDomains =
      this.nextConfig?.images?.domains && this.nextConfig?.images?.domains?.length > 5
    if (hasImagesRemotePatterns || hasImagesDomains) {
      console.info(
        chalk.grey(`-----------------------------\r\n`) +
          `[${brandify('Edgio')}] ${chalk.blueBright('Performance hint')} (💡)\r\n` +
          `We've detected that you are using the Next.js Image component with remotePatterns or domains config.\r\n` +
          `To get the best performance with Edgio, we recommend you to add those remote domains as new Properties under your Organization in Edgio Console and enable the Image Optimization and Caching features for them. \r\n` +
          `Then, you can remove those domains from the remotePatterns config and use them directly with the custom Image Loader.\r\n` +
          `See more at https://docs.edg.io/guides/v7/performance/image_optimization\r\n` +
          `and https://nextjs.org/docs/app/api-reference/components/image#loaderfile\r\n` +
          chalk.grey(`-----------------------------`)
      )
    }
  }

  /**
   * This function is used in build to get all destinations that are set by
   * rewrites. This is used to make sure that this is bundled as we don't handle
   * rewrites on CDN, but Next does. If we don't bundle this, the rewrites
   * on lambda will fail when it is sent to Next server, as it won't regenerate
   * static pages.
   * @returns List of all destinations from rewrites and redirects
   */
  async getRewritesDestinations() {
    const rewrites = this.nextConfig.rewrites ? await this.nextConfig.rewrites() : []

    const destinations: string[] = []

    if (isRewriteGroup(rewrites)) {
      const { beforeFiles, afterFiles, fallback } = rewrites
      const r = [...beforeFiles, ...afterFiles, ...fallback].map(p => p.destination)
      destinations.push(...r)
    } else {
      destinations.push(...rewrites.map(p => p.destination))
    }

    return destinations
  }

  getPrerenderManifest() {
    return nonWebpackRequire(join(this.distDirAbsolute, 'prerender-manifest.json'))
  }

  /**
   * There is an issue with Next12 where their server source code is not bundled into single file.
   * This leads to very long cold starts on the platform ~5s+, with bundling everything into single
   * we are able to get under ~1s load time from the Lambda disk.
   * We are not seeing these problems with Next 13
   */
  async optimizeAndCompileServerBuild() {
    const nextServerFile = 'next-server.js'
    const outputFile = 'next-server-optimized.js'

    const nextPackageJsonPath = resolveInPackage('next', 'package.json')
    if(!nextPackageJsonPath) throw new Error(`Couldn't find next's package.json`)

    const nextPackageJson = require(nextPackageJsonPath)

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
    const nextSourceFiles = join(
      this.builder.jsAppDir,
      'node_modules',
      'next',
      'dist',
      'server'
    )

    await this.builder.exec(buildCommand, { cwd: nextSourceFiles })
  }

  /**
   * Builds the Next app using the Next CLI
   */
  async buildNextApp() {
    // clear .next directory
    this.builder.emptyDirSync(this.distDir)

    try {
      // run the next.js build
      await this.builder.exec(this.buildCommand, {
        env: {
          ...process.env,
          // We need to add these special NODE_OPTIONS to the build command
          // as a workaround for Next.js 10 and older versions on Node 18.
          // Otherwise, the build fails with error: "error:0308010C:digital envelope routines::unsupported"
          NODE_OPTIONS: getNodeOptions(this.nextVersion || '0.0.0'),
        },
      })
    } catch (e) {
      throw new FrameworkBuildError('Next.js', this.buildCommand, e)
    }
  }

  /**
   * Copies the output of the Next standalone build to the lambda dir.
   */
  async addStandaloneBuildAssets() {
    mkdirSync(join(this.builder.jsAppDir, 'node_modules'), {
      recursive: true,
    })

    // As there is possibility to have both folders present in a build, we check for both 'pages' and 'app' folders
    const pagesDir = join(
      this.distDirAbsolute,
      'standalone',
      this.nextRootDir,
      this.distDir,
      'server/pages/'
    )
    const appDir = join(
      this.distDirAbsolute,
      'standalone',
      this.nextRootDir,
      this.distDir,
      'server/app/'
    )

    // For server file, we add our own file, so skip this one
    const serverFile = join(this.distDirAbsolute, 'standalone', this.nextRootDir, 'server.js')

    const rootFiles = [
      join(pagesDir, 'index.html'),
      join(pagesDir, 'index.json'),
      join(appDir, 'index.html'),
      join(appDir, 'index.json'),
    ]

    const manifestParser = new ManifestParser(process.cwd(), this.distDir, this.renderMode)

    // Add prerendered pages with fallback:false as we don't handle them on CDN
    // and we fallback to Next, but if fallback is set to false, Next won't regenerate
    // the page (as that's the fallback:false is for), so we need to add them to lambda
    const prerenderedPages = manifestParser
      .getPages()
      .filter(p => p.isPrerendered && p.fallback === 'fallback:false')
      .flatMap(p => (p.prerenderedRoutes ?? []).map(c => c.route))
      .map(f => join(pagesDir, f))

    const rewritesRedirectsDestinations = (await this.getRewritesDestinations()).map(f =>
      join(pagesDir, f)
    )

    const importantFiles = [...rootFiles, ...prerenderedPages, ...rewritesRedirectsDestinations]

    // Add the standalone app and dependencies, but optimize our bundle as we want to
    // exclude all prerenderd pages from the lambda bundle, but only that we can, as
    // Next is dependent on some files.
    this.builder.copySync(join(this.distDirAbsolute, 'standalone'), this.builder.jsAppDir, {
      filter: (file: string) => {
        const isInPageFolder = file.startsWith(pagesDir) || file.startsWith(appDir)

        // All files outside of pages folder are important, so skip going to the next check
        if (!isInPageFolder) return true

        const important = importantFiles.filter(f => file.startsWith(f)).length > 0

        if (important) return true

        const isServerFile = file === serverFile
        const isJson = file.endsWith('.json') && !file.endsWith('.nft.json')
        const isHtml = file.endsWith('.htm') || file.endsWith('.html')
        const isNot404 = !file.endsWith('404.html') && !file.endsWith('404.json')
        const isNot500 = !file.endsWith('500.html') && !file.endsWith('500.json')
        const notImportant = isServerFile || (isNot404 && isNot500 && (isJson || isHtml))

        if (notImportant) {
          console.log(
            `${chalk.blueBright('[Edgio]')} Bundle skipping file ${chalk.greenBright(file)}`
          )
          return false
        }

        return true
      },
    })

    // Copy the Next.js package.json to the .edgio/lambda/app dir,
    // so we can determine the build type (serverless/server) from the Next.js version in lambda
    this.builder.copySync(
      join(
        this.distDirAbsolute,
        'standalone',
        this.nextRootDir,
        'node_modules',
        'next',
        'package.json'
      ),
      join(this.builder.jsAppDir, 'node_modules', 'next', 'package.json')
    )

    if (this.edgioConfig?.next?.disableImageOptimizer) {
      console.log(
        chalk.grey(
          `[Edgio] Edgio Image Optimizer is disabled. Images will be optimized by Next's built-in image optimizer.`
        )
      )
    }
  }

  /**
   * Handles bundling the lambda for Next.js prior to 12.2.0. This includes both 'serverless' and 'experimental-serverless-trace'
   * targets.
   */
  async addLegacyBuildAssets() {
    // Add files needed by app and our connector
    ;['BUILD_ID', 'routes-manifest.json', 'prerender-manifest.json', this.renderMode].forEach(
      assetName => {
        this.builder.addJSAsset(
          join(this.distDirAbsolute, assetName),
          join(this.nextRootDir, this.distDir, assetName)
        )
      }
    )

    // Add next pages
    const pagesDir = join(
      this.builder.jsAppDir,
      this.nextRootDir,
      this.distDir,
      this.renderMode,
      'pages'
    )

    if (this.nextConfig?.target !== 'serverless') {
      // If the user has overridden the default target and is using serverless do not perform tracing for required node modules
      const pageHandlerFiles = globby
        .sync('**/*.js', {
          onlyFiles: true,
          cwd: pagesDir,
        })
        .map(file => join(pagesDir, file))

      // Add dependencies of the pages
      const { fileList } = await nodeFileTrace(pageHandlerFiles)
      Array.from(fileList)
        .filter(file => file.indexOf('node_modules') === 0)
        .forEach(file =>
          this.builder.copySync(file, join(this.builder.jsAppDir, this.nextRootDir, file))
        )
    }

    if (this.edgioConfig?.next?.disableImageOptimizer) {
      console.warn(
        `[Edgio] ${chalk.yellow(
          "Warning: Edgio Image Optimizer is disabled but serverless build doesn't include Next.js Image Optimizer. You images can be broken.\r\nPlease turn it back on or update to Next.js v12 and newer."
        )}`
      )
    }
  }

  /**
   * Move all static pages from the lambda dir to the s3 dir. We don't need them in the lambda
   * since we're serving them from s3. so that @edgio/core doesn't.  Also, having them be present
   * in the lambda will make NextRoutes add duplicate routes for each.
   */
  addSSGPages(srcDir: string, destDir: string) {
    if (!existsSync(srcDir)) return
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

  /**
   * Builds the next.config.js file for standalone build
   * with merged default values from the Next.js server.
   */
  private async buildStandaloneNextConfig() {
    // When app is using standalone build, we need to load the next config by next server
    // to get all additional config and default values added by Next Server.
    const loadConfig = nonWebpackRequire('next/dist/server/config').default
    const nextConfigWithDefaults = await loadConfig('phase-production-server', process.cwd())
    // Update the nextConfig with the defaults from the Next.js server
    this.nextConfig = nextConfigWithDefaults as NextConfig

    await new NextConfigBuilder(
      this.srcDirAbsolute,
      // Output final file to configured outputFileTracingRoot option from next.config.js.
      // This is needed for standalone builds in workspaces or when the outputFileTracingRoot is explicitly set,
      // otherwise Next.js server throws an error that it can't find the file.
      join(process.cwd(), JS_APP_DIR, this.nextRootDir),
      {
        nextConfig: nextConfigWithDefaults,
        generateSourceMap: this.edgioConfig?.next?.generateSourceMaps !== false,
      }
    ).build()
  }

  /**
   * Builds the next.config.js file for serverless builds.
   */
  private async buildServerlessNextConfig() {
    await new NextConfigBuilder(
      this.srcDirAbsolute,
      // Output final file to root of the app directory.
      join(process.cwd(), JS_APP_DIR, this.nextRootDir),
      {
        generateSourceMap: this.edgioConfig?.next?.generateSourceMaps !== false,
      }
    ).build()
    // Update the nextConfig
    this.nextConfig = getNextConfig() as NextConfig
  }

  /**
   * Validates that it contains all required Edgio plugins
   */
  private validateNextConfig() {
    if (process.env.WITH_SERVICE_WORKER_APPLIED) {
      console.warn(
        `[Edgio] ${chalk.yellow(
          'Warning: The withServiceWorker function is no longer needed in next.config.js since Edgio version 7.x. Please remove it and see the migration guide to v7.'
        )}`
      )
    }

    // See withEdgio.ts
    if(process.env.WITH_EDGIO_APPLIED !== 'true') {
      console.error(
        `${chalk.red(
          'Error:'
        )} Next.js is not properly configured for deployment on Edgio. Please add the ${chalk.green(
          'withEdgio()'
        )} plugin to next.config.js.
      
        For example:
          ${chalk.cyan(`
          const { withEdgio } = require('@edgio/next/config')
          module.exports = withEdgio({
            // additional Next.js config options here
            // ...
          })`)}
        
        Please update next.config.js file and try again. If that file does not exist, simply add the example above to the root directory of your app.
        `
      )
      process.exit(1)
    }
  }

  private buildServiceWorker() {
    // Base path is always without trailing slash
    const basePath = this.nextConfig?.basePath || ''
    return this.builder.buildServiceWorker({
      swSrc: 'sw/service-worker.js',
      swDest: '.edgio/s3/service-worker.js',
      globDirectory: '.next',
      globPatterns: ['static/**/*'],
      modifyURLPrefix: {
        'static/': `${basePath}/_next/static/`,
      },
    })
  }
}
