import { getConfig } from '@edgio/core'
import { ExtendedConfig } from '../types'

/**
 * A Next.js plugin that adds @edgio/devtools to next app
 * @param _nextConfig A next.js config
 * @return A next.js config
 */
export function withDevtools(_nextConfig: any) {
  const edgioConfig = getConfig() as ExtendedConfig
  if (edgioConfig?.next?.disableDevtools) return _nextConfig

  const normalizedNextConfig =
    typeof _nextConfig === 'function' ? _nextConfig : () => _nextConfig || {}
  const plugin = (...args: any[]): any => ({
    ...normalizedNextConfig(...args),
    webpack: (config: any, options: any) => {
      const webpackConfig = {
        ...(normalizedNextConfig(...args).webpack?.(config, options) || config),
      }

      if (options.isServer || !isEdgioDevtoolsInstalled()) return webpackConfig
      // Adding Devtools to client JS file
      const originalEntry = webpackConfig.entry
      webpackConfig.entry = async () => {
        const entries = await originalEntry()
        if (entries['main.js'].includes('@edgio/devtools/widget/install')) return entries
        entries['main.js'].unshift('@edgio/devtools/widget/install')
        return entries
      }
      return webpackConfig
    },
  })
  return typeof _nextConfig === 'function' ? plugin : plugin()
}

function isEdgioDevtoolsInstalled() {
  try {
    return !!require('@edgio/devtools/widget/install')
  } catch (e: any) {
    if (e?.code === 'MODULE_NOT_FOUND') return false
    throw e
  }
}
