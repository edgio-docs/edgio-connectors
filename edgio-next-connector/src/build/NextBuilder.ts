import globby from 'globby'
import { DeploymentBuilder, BuildOptions, resolveInPackage } from '@edgio/core/deploy'
import { join, relative } from 'path'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'
import nonWebpackRequire from '@edgio/core/utils/nonWebpackRequire'
import validateNextConfig from './validateNextConfig'
import { nodeFileTrace } from '@vercel/nft'
import getNextConfig from '../getNextConfig'
import NextConfigBuilder from './NextConfigBuilder'
import { getConfig } from '@edgio/core/config'
import {lt, gt} from 'semver'
import { FAR_FUTURE_TTL, NEXT_PRERENDERED_PAGES_FOLDER, NEXT_ROOT_DIR_FILE } from '../constants'
import { ExtendedConfig, RenderMode, RENDER_MODES } from '../types'
import getNextVersion from '../util/getNextVersion'
import { BuilderOptions } from './BuilderOptions'
import getRenderMode from '../util/getRenderMode'
import getBuildId from '../util/getBuildId'
import chalk from 'chalk'
import { existsSync, appendFileSync, mkdirSync } from 'fs'
import getNodeOptions from "../util/getNodeOptions";
import { NextConfig, isRewriteGroup } from '../next.types'
import ManifestParser from '../router/ManifestParser'

export default class NextBuilder {
  protected builder: DeploymentBuilder
  protected srcDir: string
  protected distDir: string
  protected srcDirAbsolute: string
  protected distDirAbsolute: string
  protected nextRootDir: string
  protected edgioConfig: ExtendedConfig
  protected nextConfig: NextConfig
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
    this.nextRootDir = './'
    this.builder = new DeploymentBuilder(process.cwd())
    this.edgioConfig = getConfig() as ExtendedConfig
    this.nextConfig = getNextConfig() as NextConfig
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
      await this.loadStandaloneBuildConfig()
      await this.addStandaloneBuildAssets()
    } else {
      console.log(`> Using Next ${this.nextConfig.target} build...`)
      await this.addLegacyBuildAssets()
    }

    // Add the file with relative location to the Next.js app.
    // This is needed for Next.js 13 app which is built in workspaces.
    this.builder.writeFileSync(join(this.builder.jsAppDir, NEXT_ROOT_DIR_FILE), this.nextRootDir)

    // builds the next.config.js file and add our config file handler
    const nextConfigBuilder = new NextConfigBuilder(this.builder, {
      nextConfig: this.nextConfig,
      generateSourceMap: this.edgioConfig?.next?.generateSourceMaps ?? true,
      nextRootDir: this.nextRootDir,
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
          "Warning: Next.js 11 and older versions are not officially supported. The support for these older versions via Edgio is experimental, and not all features might work correctly.\r\nWe recommend upgrading your application to Next.js 12 and newer for the best experience."
        )}`
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
    
    const rewrites = this.nextConfig.rewrites ?
      await this.nextConfig.rewrites() :
      [];

    const destinations: string[] = [];
    
    if (isRewriteGroup(rewrites)) {
      const { beforeFiles, afterFiles, fallback } = rewrites;
      const r = [...beforeFiles, ...afterFiles, ...fallback].map(p => p.destination)
      destinations.push(...r);
    } else {
      destinations.push(...rewrites.map(p => p.destination));
    }

    return destinations;    
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
    const nextSourceFiles = join(
      this.builder.jsAppDir,
      this.nextRootDir,
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
    validateNextConfig(this.srcDir)

    try {
      // run the next.js build
      await this.builder.exec(this.buildCommand, {
        env: {
          ...process.env,
          // We need to add these special NODE_OPTIONS to the build command
          // as a workaround for Next.js 10 and older versions on Node 18.
          // Otherwise, the build fails with error: "error:0308010C:digital envelope routines::unsupported"
          NODE_OPTIONS: getNodeOptions(this.nextVersion || '0.0.0'),
        }
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

    // As there is posibility to have both folders present in a build, we check for both 'pages' and 'app' folders
    const pagesDir = join(this.distDirAbsolute, 'standalone', this.nextRootDir, this.distDir, "server/pages/") 
    const appDir = join(this.distDirAbsolute, 'standalone', this.nextRootDir, this.distDir, "server/app/")

    // For server file, we add our own file, so skip this one
    const serverFile = join(this.distDirAbsolute, 'standalone', this.nextRootDir, 'server.js')

    const rootFiles = [
      join(pagesDir, "index.html"),
      join(pagesDir, "index.json"),
      join(appDir, "index.html"),
      join(appDir, "index.json")];

    const manifestParser = new ManifestParser("./", this.distDir, this.renderMode)

    // Add prerendered pages with fallback:false as we don't handle them on CDN
    // and we fallback to Next, but if fallback is set to false, Next won't regenerate
    // the page (as that's the fallback:false is for), so we need to add them to lambda
    const prerenderedPages = manifestParser
      .getPages()
      .filter(p => p.isPrerendered && p.fallback === 'fallback:false')
      .flatMap(p => (p.prerenderedRoutes ?? []).map(c => c.route))
      .map((f) => join(pagesDir, f));

    const rewritesRedirectsDestinations = (await this.getRewritesDestinations())
      .map((f) => join(pagesDir, f))
  
    const importantFiles = [...rootFiles, ...prerenderedPages, ...rewritesRedirectsDestinations]

    // Add the standalone app and dependencies, but optimize our bundle as we want to 
    // exclude all prerenderd pages from the lambda bundle, but only that we can, as
    // Next is dependent on some files.
    this.builder.copySync(join(this.distDirAbsolute, 'standalone'), this.builder.jsAppDir, {      
      filter: (file: string) => {
        const isInPageFolder = file.startsWith(pagesDir) || file.startsWith(appDir)

        // All files outside of pages folder are important, so skip going to the next check
        if (!isInPageFolder)
          return true;
        
        const important = importantFiles.filter(f => file.startsWith(f)).length > 0
        
        if (important)
          return true;

        const isServerFile = file === serverFile
        const isJson = file.endsWith(".json") && !file.endsWith(".nft.json")        
        const isHtml = file.endsWith(".htm") || file.endsWith(".html")
        const isNot404 = !file.endsWith("404.html") && !file.endsWith("404.json")
        const isNot500 = !file.endsWith("500.html") && !file.endsWith("500.json")
        const notImportant = isServerFile || (isNot404 && isNot500 && (isJson || isHtml))        

        if (notImportant) {
          console.log(`${chalk.blueBright("[Edgio]")} Bundle skipping file ${chalk.greenBright(file)}`)
          return false
        }

        return true
      }
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
  }

  /**
   * Loads the config for the standalone build output
   */
  async loadStandaloneBuildConfig() {
    // When app is using standalone build, we need to load the next config by next server
    // to get all additional config and default values added by Next Server.
    const loadConfig = nonWebpackRequire('next/dist/server/config').default
    this.nextConfig = await loadConfig('phase-production-server', process.cwd())

    // When Next.js is built in workspaces or the outputFileTracingRoot config option is explicitly set,
    // the standalone build folder will have different folder structure.
    // This is where we can get the project root folder where the server files are actually placed.
    this.nextRootDir =
      relative(this.nextConfig?.experimental!.outputFileTracingRoot!, process.cwd()) || './'
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
      fileList
        .filter(file => file.indexOf('node_modules') === 0)
        .forEach(file =>
          this.builder.copySync(file, join(this.builder.jsAppDir, this.nextRootDir, file))
        )
    }

    if (this.edgioConfig?.next?.disableImageOptimizer) {
      console.log(
          chalk.grey(
              `[Edgio] Edgio Image Optimizer is disabled. Images will be optimized by Next's built-in image optimizer if it's available.`
          )
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
