import { getConfig } from '@edgio/core'
import { ExtendedConfig } from '../types'
import { resolve, relative, dirname } from 'path'
import { isCloud, isProductionBuild } from '@edgio/core/environment'
import getNextVersion from '../util/getNextVersion'
import { satisfies } from 'semver'
import resolvePackagePath from 'resolve-package-path'
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs'

/**
 * A Next.js plugin that adds our image loader into next-config.
 * This loader replaces Next's image optimizer with our Edgio Image Optimizer.
 * It generates URLs for images (when <Image> component from next/image is used)
 * together with correct params.
 *
 * NOTE: Next's image optimizer on /_next/image path is disabled
 * when there's other than default image loader defined in next.config.js.
 *
 * @param _nextConfig A next.js config
 * @return A next.js config
 */
export function withImageLoaderConfig(_nextConfig: any) {
  const normalizedNextConfig =
    typeof _nextConfig === 'function' ? _nextConfig : () => _nextConfig || {}

  const plugin = (...args: any[]): any => {
    const edgioConfig = getConfig() as ExtendedConfig
    const nextConfig = normalizedNextConfig(...args)
    const nextVersion = getNextVersion() || '0.0.0'

    const disableImageOptimizer = edgioConfig?.next?.disableImageOptimizer
    const imageLoader = nextConfig.images?.loader

    // Do not add our image loader if we're in development mode,
    // Edgio Image Optimizer is disabled or
    // there's already a custom image loader defined in next.config.js
    // NOTE: This is needed because Next.js disables its built-in image optimizer
    // when there's other than default image loader defined in next.config.js.
    if ((!isCloud() && !isProductionBuild()) || imageLoader || disableImageOptimizer) {
      return nextConfig
    }

    // The images.loaderFile config option is supported since Next.js 13.
    if (satisfies(nextVersion, '>= 13.0.0')) {
      // The path needs to be relative to the project root, otherwise Next.js will throw an error.
      const imageLoaderPath = relative(process.cwd(), resolve(__dirname, '..', 'imageLoader.js'))
      return {
        ...nextConfig,
        images: {
          ...(nextConfig.images ?? {}),
          loader: 'custom',
          loaderFile: imageLoaderPath,
        },
      }
    } else {
      // The older versions 10,11 etc... support only built-in loaders such as 'akamai', 'cloudinary' etc...
      // That's why need to do this 'hack' and add our image loader directly into next's source code.
      replaceBuiltInImageLoader()
      return {
        ...nextConfig,
        images: {
          ...(nextConfig.images ?? {}),
          path: '/',
          loader: 'imgix',
        },
      }
    }
  }

  return typeof _nextConfig === 'function' ? plugin : plugin()
}

/**
 * This function modifies a source code of Next.js
 * and adds our image loader instead of built-in image loader in next/image.
 * This is needed to pass the next.config.js validation that is done on several places.
 */
export function replaceBuiltInImageLoader() {
  const packageJsonPath = resolvePackagePath('next', process.cwd()) || './'
  const packagePath = dirname(packageJsonPath)
  const nextImagePath = resolve(packagePath, 'dist', 'client', 'image.js')
  const nextImageOriginalPath = resolve(packagePath, 'dist', 'client', 'image.original.js')

  if (!existsSync(nextImagePath)) return

  const nextImageModuleContent = readFileSync(nextImagePath, 'utf-8')

  // Do not add our loader if it's already there.
  if (nextImageModuleContent.includes('@edgio/next/imageLoader')) return

  // Make a backup of the original file.
  copyFileSync(nextImagePath, nextImageOriginalPath)

  // Add our image loader instead of built-in image loader in next-server/client/image.js
  // Example:
  // const loaders = new Map([['edgio', require('@edgio/next/imageLoader').default], ['cloudinary', cloudinaryLoader], ['akamai', akamaiLoader], ['default', defaultLoader]]);
  writeFileSync(
    nextImagePath,
    nextImageModuleContent.replace(
      /(\[\s*['"]imgix['"]\s*,\s*imgixLoader\s*\])/im,
      `['imgix', require('@edgio/next/imageLoader').default]`
    )
  )
}
