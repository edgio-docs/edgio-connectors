/* istanbul ignore file */

import globby from 'globby'
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import { join } from 'path'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'
import nonWebpackRequire from '@edgio/core/utils/nonWebpackRequire'
import validateNextConfig from './validateNextConfig'
import { nodeFileTrace } from '@vercel/nft'
import { getServerBuildAvailability } from '../util/getServerBuildAvailability'
import getNextConfig from '../getNextConfig'
import NextConfigBuilder from './NextConfigBuilder'
import config from '@edgio/core/config'
import { lt } from 'semver'

import { FAR_FUTURE_TTL } from '../router/constants'
import getNextVersion from '../util/getNextVersion'

interface BuilderOptions {
  /**
   * The path to the Next.js source directory from the root of the app
   */
  srcDir: string
  /**
   * The path to the Next.js dist directory from the root of the app
   */
  distDir: string
  /**
   * The command to use to build the Next.js app
   */
  buildCommand: string
}

/**
 * Creates a build entrypoint for a connector
 * @param param0
 */
export default function createBuildEntryPoint({ srcDir, distDir, buildCommand }: BuilderOptions) {
  const builder = new DeploymentBuilder(process.cwd())
  const srcDirAbsolute = join(process.cwd(), srcDir)
  const distDirAbsolute = join(process.cwd(), distDir)

  return async function build(options: BuildOptions) {
    const { skipFramework } = options
    const config = getNextConfig()
    const defaultLocale = config?.i18n?.defaultLocale

    builder.clearPreviousBuildOutput()

    if (!skipFramework) {
      await buildNextApp(srcDirAbsolute, distDirAbsolute, buildCommand, builder)
    }

    const { useServerBuild } = getServerBuildAvailability({ config })
    const buildOutputDir = useServerBuild ? 'server' : 'serverless'
    const pagesDir = join(builder.jsDir, distDir, buildOutputDir, 'pages')
    const prerenderManifest = nonWebpackRequire(join(distDirAbsolute, 'prerender-manifest.json'))

    if (useServerBuild) {
      console.log('> Using Next standalone build...')
      await addStandaloneBuildAssets(distDir, builder)
    } else {
      console.log(`> Using Next ${config.target} build...`)
      await addLegacyBuildAssets(config.target, pagesDir, distDir, buildOutputDir, builder)
    }

    // builds the next.config.js file and add our config file handler
    const nextConfigBuilder = new NextConfigBuilder(builder, {
      useServerBuild,
      generateSourceMap: process.env.EDGIO_SOURCE_MAPS !== 'false',
      distDir,
    })
    await nextConfigBuilder.build()

    addSSGPages(
      join(distDirAbsolute, buildOutputDir, 'pages'),
      join(distDir, buildOutputDir, 'pages'),
      defaultLocale,
      prerenderManifest,
      builder
    )

    await builder
      .addJSAsset(join(distDirAbsolute, 'BUILD_ID')) // needed for NextRoutes
      .addJSAsset(join(distDirAbsolute, 'routes-manifest.json')) // needed for rewrites and redirects
      .addJSAsset(join(distDirAbsolute, 'prerender-manifest.json')) // needed for cache times
      .build()

    const nextVersion = getNextVersion()
    // Build optimizations for server build on Next 12, until Next13
    if (useServerBuild && nextVersion && lt(nextVersion, '13.0.0')) {
      await optimizeAndCompileServerBuild(builder)
    }

    if (process.env.EDGIO_SOURCE_MAPS === 'false') {
      console.log(`> Found edgioSourceMaps set to false`)
      console.log(`> Deleting .map files from lambda folder`)
      builder.deleteMapFiles(builder.jsDir)
    }
  }
}

/**
 * There is an issue with Next12 where their server source code is not bundled into single file.
 * This leads to very long cold starts on the platform ~5s+, with bundling everything into single
 * we are able to get under ~1s load time from the Lambda disk.
 *
 * We are not seeing these problems with Next 13
 * @param builder
 */
async function optimizeAndCompileServerBuild(builder: DeploymentBuilder) {
  const nextServerFile = 'next-server.js'
  const outputFile = 'next-server-optimized.js'

  const nextPackageJson = require(join(process.cwd(), 'node_modules', 'next', 'package.json'))

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
  const nextSourceFiles = join(builder.edgioDir, 'lambda', 'node_modules', 'next', 'dist', 'server')

  await builder.exec(buildCommand, { cwd: nextSourceFiles })
}

/**
 * Copies the output of the Next standalone build to the lambda dir.
 */
async function addStandaloneBuildAssets(distDir: string, builder: DeploymentBuilder) {
  const distDirAbsolute = join(process.cwd(), distDir)
  const { jsDir } = builder

  // add the standalone app and dependencies
  builder.copySync(join(distDirAbsolute, 'standalone'), jsDir, {
    // exclude the server.js since we roll our own in prod.ts
    filter: (file: string) => file !== join(distDirAbsolute, 'standalone', 'server.js'),
  })
}

/**
 * Handles bundling the lambda for Next.js prior to 12.2.0. This includes both 'serverless' and 'experimental-serverless-trace'
 * targets.
 */
async function addLegacyBuildAssets(
  target: string,
  pagesDir: string,
  distDir: string,
  buildOutputDir: string,
  builder: DeploymentBuilder
) {
  builder
    // React components and api endpoints
    .addJSAsset(join(distDir, buildOutputDir))

  if (target !== 'serverless') {
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
      .forEach(file => builder.copySync(file, join(builder.edgioDir, 'lambda', file)))
  }

  const disableImageOptimizer = config.get('disableImageOptimizer', false)
  if (disableImageOptimizer) {
    console.warn(
      "[Edgio] WARNING: This build target doesn't contain next image optimizer. All images will be unoptimized when Edgio image optimizer is disabled and other optimizer is not provided."
    )
  }
}

/**
 * Builds the Next app using the Next CLI
 */
async function buildNextApp(
  srcDir: string,
  distDir: string,
  buildCommand: string,
  builder: DeploymentBuilder
) {
  // clear .next directory
  builder.emptyDirSync(distDir)
  validateNextConfig(srcDir)

  try {
    // run the next.js build
    await builder.exec(buildCommand)
  } catch (e) {
    throw new FrameworkBuildError('Next.js', buildCommand, e)
  }
}

/**
 * Move all static pages from the lambda dir to the s3 dir. We don't need them in the lambda
 * since we're serving them from s3. so that @edgio/core doesn't.  Also, having them be present
 * in the lambda will make NextRoutes add duplicate routes for each.
 */
function addSSGPages(
  srcDir: string,
  destDir: string,
  defaultLocale: string,
  prerenderManifest: any,
  builder: DeploymentBuilder
) {
  builder.log(`Adding SSG pages from ${srcDir}`)

  // Handle special case for index page
  // The path is /index but in route manifest it's just /
  if (prerenderManifest.routes['/']) {
    prerenderManifest.routes['/index'] = prerenderManifest.routes['/']
  }

  // Add SSG pages with normalized paths
  // e.g. /path/to/page/index.html and /path/to/page/index.json
  globby
    .sync('**/*.{json,html}', {
      onlyFiles: true,
      ignore: ['**/*.nft.json'],
      cwd: srcDir,
    })
    .forEach(file => {
      const src = join(srcDir, file)
      let dest = join(destDir, file)

      if (!file.match(/index\.(html|json)$/)) {
        // Index files are a special case. "/" should map to "/index.html", not "/index/index.html"
        dest = join(destDir, file.replace(/\.(html|json)$/, '/index.$1'))
      }

      builder.addStaticAsset(src, dest)

      // Set TTL
      const key = '/' + file.replace(/\.(html|json)$/, '')
      const metadata = prerenderManifest.routes[key]

      if (metadata?.initialRevalidateSeconds) {
        builder.log(`Setting TTL of ${metadata.initialRevalidateSeconds} seconds for ${dest}`)
        builder.setStaticAssetExpiration(dest, metadata.initialRevalidateSeconds, FAR_FUTURE_TTL)

        if (defaultLocale) {
          dest = dest.replace(new RegExp(`/${defaultLocale}/`), '/')
          builder.log(`Setting TTL of ${metadata.initialRevalidateSeconds} seconds for ${dest}`)
          builder.setStaticAssetExpiration(dest, metadata.initialRevalidateSeconds, FAR_FUTURE_TTL)
        }
      }
    })

  if (defaultLocale) {
    // copy assets for the default locale to the root dir so they can be served without a locale
    builder.addStaticAsset(join(builder.staticAssetsDir, destDir, defaultLocale), destDir)
  }
}
