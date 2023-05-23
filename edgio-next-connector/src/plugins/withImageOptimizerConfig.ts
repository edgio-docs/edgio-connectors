import { getConfig } from '@edgio/core'
import { ExtendedConfig } from '../types'

/**
 * A Next.js plugin that adds allowed domains for our edgio image optimizer into next-config
 * @param _nextConfig A next.js config
 * @return A next.js config
 */
export function withImageOptimizerConfig(_nextConfig: any) {
  const edgioConfig = getConfig() as ExtendedConfig
  const normalizedNextConfig =
    typeof _nextConfig === 'function' ? _nextConfig : () => _nextConfig || {}

  const plugin = (...args: any[]): any => {
    const nextConfig = normalizedNextConfig(...args)

    // By default all next/image images are proxied to our image optimizer
    // When our image optimizer is disabled we need to transform relative paths to absolute paths
    // and add allowed domains to config for next/image optimizer
    const disableImageOptimizer = edgioConfig?.next?.disableImageOptimizer || false
    const predefinedDomains = disableImageOptimizer
      ? ['localhost', '127.0.0.1', '[::1]', 'SET_EDGIO_IMAGE_OPTIMIZER_HOST_HERE']
      : []
    return {
      ...nextConfig,
      images: {
        ...(nextConfig.images ?? {}),
        domains: [...predefinedDomains, ...(nextConfig.images?.domains ?? [])],
      },
    }
  }
  return typeof _nextConfig === 'function' ? plugin : plugin()
}
