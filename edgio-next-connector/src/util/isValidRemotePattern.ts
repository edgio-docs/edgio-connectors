import { NextConfig } from '../next.types'
import { EDGIO_IMAGE_PROXY_PATH } from '../constants'

/**
 * Validates a remote pattern (url)
 * and returns true if it's valid image URL
 * according to the next.js config, otherwise false.
 * @param nextConfig The next.js config
 * @param url The url to validate
 * @returns {boolean}
 */
export default function isValidRemotePattern(nextConfig: NextConfig, url: string): boolean {
  const parsedUrl = new URL(url, 'http://127.0.0.1')
  const remoteDomains = nextConfig?.images?.domains ?? []
  const remotePatterns = nextConfig?.images?.remotePatterns ?? []

  // Don't allow to proxy images to itself
  if (parsedUrl?.pathname.startsWith(EDGIO_IMAGE_PROXY_PATH)) {
    return false
  }

  // If the image is from a remote domain, check if it's allowed
  if (
    remoteDomains.find(domain => {
      return domain === `${parsedUrl.hostname}${parsedUrl.port ? `:${parsedUrl.port}` : ''}`
    })
  ) {
    return true
  }

  // If the image is from a remote pattern, check if it's allowed
  return !!remotePatterns.find(
    ({ hostname, pathname, protocol = parsedUrl.protocol, port = parsedUrl.port }) => {
      // The hostname and pathname can contain wildcard patterns:
      // '*' - match a single path segment or subdomain
      // '**' - match any number of path segments at the end of subdomain or at the beginning
      const hostnameRegex = hostname ? hostnameToRegex(hostname) : /.*/
      const pathnameRegex = pathname ? pathnameToRegex(pathname) : /.*/

      return (
        hostnameRegex.test(parsedUrl.hostname) &&
        pathnameRegex.test(parsedUrl.pathname) &&
        protocol.replace(':', '') === parsedUrl.protocol.replace(':', '') &&
        port.toString() === parsedUrl.port.toString()
      )
    }
  )
}

/**
 * Converts a hostname pattern to a regex
 * with support for wildcard patterns
 * and . (dot) character as segments delimiter.
 * @param hostname The hostname pattern
 */
function hostnameToRegex(hostname: string): RegExp {
  return new RegExp(`^${hostname.replace(/\*\*/g, '(.+)?').replace(/\*/g, '[^.]+')}$`)
}

/**
 * Converts a pathname pattern to a regex
 * with support for wildcard patterns
 * and / (slash) character as segments delimiter.
 * @param pathname The pathname pattern
 */
function pathnameToRegex(pathname: string): RegExp {
  return new RegExp(`^${pathname.replace(/\*\*/g, '(.+)?').replace(/\*/g, '[^/]+')}/?$`)
}
