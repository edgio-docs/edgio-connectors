import nonWebpackRequire from '@xdn/core/utils/nonWebpackRequire'
import { join } from 'path'

/**
 * Gets the build output directory for Next.js
 */
export default function getDistDir() {
  const root = process.cwd()
  const nextConfigFile = join(root, 'next.config.js')

  let nextConfig: any

  try {
    nextConfig = nonWebpackRequire(nextConfigFile)
  } catch (e) {
    // will get here if no next config file is present
  }

  if (typeof nextConfig === 'function') {
    nextConfig = nextConfig('phase-production-build', {})
  }

  return nextConfig?.distDir || '.next'
}
