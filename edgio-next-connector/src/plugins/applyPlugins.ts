import { withEdgioConfig } from './withEdgioConfig'
import { withDevtools } from './withDevtools'
import { withImageOptimizerConfig } from './withImageOptimizerConfig'

/**
 * Creates a Next.js config suitable for deployment on Edgio
 * by applying all plugins for next-config
 *
 * Example usage:
 *
 * ```js
 *  // next.config.js
 *
 *  import withEdgio from '@edgio/next/withEdgio'
 *
 *  module.exports = withEdgio({
 *    webpack(config, options) {
 *      // your custom webpack config here
 *    }
 *  })
 * ```
 *
 * @param _nextConfig A next.js config
 * @return A next.js config
 */
export default function applyPlugins(_nextConfig: any) {
  const normalizedNextConfig =
    typeof _nextConfig === 'function' ? _nextConfig : () => _nextConfig || {}

  const plugin = (...args: any[]): any => {
    // validateNextConfig looks for this to ensure that the configuration is valid
    process.env.WITH_EDGIO_APPLIED = 'true'

    const nextConfig = normalizedNextConfig(...args)
    const plugins = [withEdgioConfig, withImageOptimizerConfig, withDevtools]
    return plugins.reduce((appliedConfig, plugin) => plugin(appliedConfig), nextConfig)
  }
  return typeof _nextConfig === 'function' ? plugin : plugin()
}
