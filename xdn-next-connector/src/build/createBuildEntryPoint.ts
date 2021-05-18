import globby from 'globby'
import { DeploymentBuilder, BuildOptions } from '@xdn/core/deploy'
import { join } from 'path'
import FrameworkBuildError from '@xdn/core/errors/FrameworkBuildError'
import nonWebpackRequire from '@xdn/core/utils/nonWebpackRequire'
import validateNextConfig from './validateNextConfig'
import { existsSync } from 'fs'

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

  /**
   * Configure SSG pages to expire based on the revalidate time returned by getStaticProps, which
   * is stored in .next/prerender-manifest.json
   */
  function setSsgStaticAssetExpiration(builder: DeploymentBuilder) {
    const prerenderManifest = <{ [key: string]: any }>(
      nonWebpackRequire(join(distDirAbsolute, 'prerender-manifest.json'))
    )

    for (const [path, entry] of Object.entries(prerenderManifest.routes)) {
      const { initialRevalidateSeconds } = <any>entry

      if (initialRevalidateSeconds) {
        builder
          .setStaticAssetExpiration(
            `${distDir}/serverless/pages${path}.html`,
            initialRevalidateSeconds,
            initialRevalidateSeconds // temporary fix to pass build
          )
          .setStaticAssetExpiration(
            `${distDir}/serverless/pages${path}.json`,
            initialRevalidateSeconds,
            initialRevalidateSeconds // temporary fix to pass build
          )
      }
    }
  }

  return async function build(options: BuildOptions) {
    const { skipFramework } = options
    let nextConfig = nonWebpackRequire(join(srcDirAbsolute, 'next.config.js'))

    if (typeof nextConfig === 'function') {
      nextConfig = nextConfig('phase-production-build', {})
    }

    builder.clearPreviousBuildOutput()

    if (!skipFramework) {
      // clear .next directory
      builder.emptyDirSync(distDirAbsolute)

      // ensure that next.config.js exists and has target: serverless
      validateNextConfig(srcDirAbsolute)

      try {
        // run the next.js build
        await builder.exec(buildCommand)
      } catch (e) {
        throw new FrameworkBuildError('Next.js')
      }
    }

    builder
      // React components and api endpoints
      .addJSAsset(join(distDirAbsolute, 'serverless'), undefined, {
        filter: src => !src.endsWith('.map'),
      })

      // needed for rewrites and redirects
      .addJSAsset(join(distDirAbsolute, 'routes-manifest.json'))

      // needed for cache times
      .addJSAsset(join(distDirAbsolute, 'prerender-manifest.json'))

    // write a minimal next.config.js to the lambda so that we can find the path to static assets in the cloud
    builder.writeFileSync(
      join(builder.jsDir, 'next.config.js'),
      `module.exports=${JSON.stringify({ distDir })}`
    )

    setSsgStaticAssetExpiration(builder)

    await builder.build()

    const pages = join(builder.jsDir, distDir, 'serverless', 'pages')

    // Remove all static pages from the lambda dir.  We don't need them in the lambda
    // since we're serving them from s3. so that @xdn/core doesn't.  Also, having them be present
    // in the lambda will make NextRoutes add duplicate routes for each.
    globby
      .sync('**/*.{json,html}', {
        onlyFiles: true,
        cwd: pages,
      })
      .forEach(file => {
        const src = join(pages, file)
        builder.addStaticAsset(src, join(distDir, 'serverless', 'pages', file))
        builder.removeSync(src)
      })

    const defaultLocale = nextConfig.i18n?.defaultLocale
    const staticPagesDir = join(builder.staticAssetsDir, distDir, 'serverless', 'pages')

    if (defaultLocale) {
      builder.copySync(join(staticPagesDir, defaultLocale), staticPagesDir)

      // example: copy "en-US.html" to ".html"
      const indexHtml = join(staticPagesDir, `${defaultLocale}.html`)
      if (existsSync(indexHtml)) {
        builder.copySync(indexHtml, join(staticPagesDir, '.html'))
      }

      // example: copy "en-US.json" to ".json"
      const indexJson = join(staticPagesDir, `${defaultLocale}.json`)
      if (existsSync(indexJson)) {
        builder.copySync(indexJson, join(staticPagesDir, 'index.json'))
      }
    }
  }
}
