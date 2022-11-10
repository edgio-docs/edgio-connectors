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
import config from '@edgio/core/config'

import { FAR_FUTURE_TTL } from '../router/constants'

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
    const defaultLocale = config.i18n?.defaultLocale

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

    if (process.env.EDGIO_SOURCE_MAPS === 'false') {
      console.log(`> Found edgioSourceMaps set to false`)
      console.log(`> Deleting .map files from lambda folder`)
      builder.deleteMapFiles(builder.jsDir)
    }
  }
}

/**
 * Copies the output of the Next standalone build to the lambda dir.
 */
async function addStandaloneBuildAssets(distDir: string, builder: DeploymentBuilder) {
  const distDirAbsolute = join(process.cwd(), distDir)
  const { jsDir } = builder

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

  builder.writeFileSync(join(jsDir, 'next.config.js'), serverConfigSrc)

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

    // write a minimal next.config.js to the lambda so that we can find the path to static assets in the cloud
    .writeFileSync(
      join(builder.jsDir, 'next.config.js'),
      `module.exports=${JSON.stringify({ distDir })}`
    )

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
