import getNextConfig from '../getNextConfig'

/**
 * Gets the build output directory for Next.js
 */
export default function getDistDir() {
  return getDistDirFromConfig(getNextConfig())
}

/**
 * Gets the build output directory for Next.js from the specified config.
 * @param nextConfig
 * @returns
 */
export function getDistDirFromConfig(nextConfig: any) {
  return nextConfig?.distDir || '.next'
}
