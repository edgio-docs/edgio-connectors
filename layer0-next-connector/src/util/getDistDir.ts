import getNextConfig from '../getNextConfig'

/**
 * Gets the build output directory for Next.js
 */
export default function getDistDir() {
  return getNextConfig().distDir || '.next'
}
