import getNextVersion from '../util/getNextVersion'
import { satisfies } from 'semver'

/**
 * A Next.js plugin that adds allowed domains for Next's Image Optimizer into next-config.
 * This is needed for the Image Optimizer to work in lambda, because images are served from
 * S3 and not from the local filesystem.
 * @param _nextConfig A next.js config
 * @return A next.js config
 */
export function withImageDomainsConfig(_nextConfig: any) {
  const normalizedNextConfig =
    typeof _nextConfig === 'function' ? _nextConfig : () => _nextConfig || {}

  const plugin = (...args: any[]): any => {
    const nextConfig = normalizedNextConfig(...args)
    const nextVersion = getNextVersion() || '0.0.0'
    const predefinedDomains = [
      'localhost',
      '127.0.0.1',
      '[::1]',
      'SET_EDGIO_IMAGE_OPTIMIZER_HOST_HERE',
    ]
    const predefinedRemotePatterns = predefinedDomains.map(domain => ({
      hostname: domain,
    }))

    // Add allowed domains to config for next's image optimizer to work.
    // NOTE: The image.domains option is deprecated since Next.js 14,
    // so we need to use image.remotePatterns instead
    // but this option was added in Next.js 12.0.0.
    if (satisfies(nextVersion, '>=12.0.0')) {
      return {
        ...nextConfig,
        images: {
          ...(nextConfig.images ?? {}),
          remotePatterns: [
            ...predefinedRemotePatterns,
            ...(nextConfig.images?.remotePatterns ?? []),
          ],
        },
      }
    } else {
      return {
        ...nextConfig,
        images: {
          ...(nextConfig.images ?? {}),
          domains: [...predefinedDomains, ...(nextConfig.images?.domains ?? [])],
        },
      }
    }
  }
  return typeof _nextConfig === 'function' ? plugin : plugin()
}
