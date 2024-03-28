import getNextConfig from '../getNextConfig'
import { NextConfig } from '../next.types'

/**
 * Gets the pageExtensions from Next config
 */
export default function getPageExtensions() {
  return getPageExtensionsFromConfig(getNextConfig())
}

/**
 * Gets the pageExtensions from the specified config.
 * @param nextConfig
 * @returns
 */
export function getPageExtensionsFromConfig(nextConfig: NextConfig) {
  // Default extensions should be same as in next default config
  // https://nextjs.org/docs/api-reference/next.config.js/custom-page-extensions
  return nextConfig.pageExtensions || ['tsx', 'ts', 'jsx', 'js']
}
