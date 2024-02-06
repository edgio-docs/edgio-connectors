import isValidRemotePattern from '../../../src/util/isValidRemotePattern'

describe('isValidRemotePattern', () => {
  it('should return false by default', () => {
    const nextConfig = {}
    expect(isValidRemotePattern(nextConfig, 'https://example.com')).toBe(false)
    expect(isValidRemotePattern(nextConfig, '')).toBe(false)
    expect(isValidRemotePattern(nextConfig, undefined)).toBe(false)
  })

  describe('image.domains', () => {
    it('should work with domain', () => {
      const nextConfig = {
        images: {
          domains: ['example.com'],
        },
      }
      expect(isValidRemotePattern(nextConfig, 'https://example.com')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'http://example.com')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'http://example.com/anything')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'http://www.example.com')).toBe(false)
    })

    it('should work with domain and port', () => {
      const nextConfig = {
        images: {
          domains: ['example.com:3000'],
        },
      }
      expect(isValidRemotePattern(nextConfig, 'https://example.com:3000')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'http://example.com:3000')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://example.com:3000/anything')).toBe(true)
    })
  })

  describe('image.remotePatterns', () => {
    it('should work just with hostname', () => {
      const nextConfig = {
        images: {
          remotePatterns: [
            {
              hostname: 'example.com',
            },
          ],
        },
      }
      expect(isValidRemotePattern(nextConfig, 'https://example.com')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'http://example.com')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'http://example.com/anything')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'http://example.com:3000')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'http://www.example.com')).toBe(false)
    })

    it('should work with hostname and port', () => {
      const nextConfig = {
        images: {
          remotePatterns: [
            {
              hostname: 'example.com',
              port: 3000,
            },
          ],
        },
      }
      expect(isValidRemotePattern(nextConfig, 'https://example.com:3000')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'http://example.com:3000')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://example.com:3000/anything')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://example.com')).toBe(false)
    })

    it('should work with hostname, port and protocol', () => {
      const nextConfig = {
        images: {
          remotePatterns: [
            {
              hostname: 'example.com',
              port: 3000,
              protocol: 'https',
            },
          ],
        },
      }
      expect(isValidRemotePattern(nextConfig, 'https://example.com:3000')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://example.com:3000/anything')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'http://example.com')).toBe(false)
      expect(isValidRemotePattern(nextConfig, 'http://example.com:3000')).toBe(false)
      expect(isValidRemotePattern(nextConfig, 'http://example.com:3000/anything')).toBe(false)
    })

    it('should work with hostname, port, protocol and path', () => {
      const nextConfig = {
        images: {
          remotePatterns: [
            {
              hostname: 'example.com',
              port: 3000,
              protocol: 'https',
              pathname: '/anything',
            },
          ],
        },
      }
      expect(isValidRemotePattern(nextConfig, 'https://example.com:3000/anything')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://example.com:3000/something')).toBe(false)
      expect(isValidRemotePattern(nextConfig, 'http://example.com')).toBe(false)
      expect(isValidRemotePattern(nextConfig, 'http://example.com:3000')).toBe(false)
      expect(isValidRemotePattern(nextConfig, 'http://example.com:3000/anything')).toBe(false)
    })

    it('should work with wildcard subdomains', () => {
      const nextConfig = {
        images: {
          remotePatterns: [
            {
              hostname: '*.example.com',
            },
          ],
        },
      }
      expect(isValidRemotePattern(nextConfig, 'https://host1.example.com')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://host2.example.com')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://sub.host3.example.com')).toBe(false)
      expect(isValidRemotePattern(nextConfig, 'https://example.com')).toBe(false)
    })

    it('should work with wildcard match all subdomains', () => {
      const nextConfig = {
        images: {
          remotePatterns: [
            {
              hostname: '**.example.com',
            },
          ],
        },
      }
      expect(isValidRemotePattern(nextConfig, 'https://host1.example.com')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://host2.example.com')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://sub.host3.example.com')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://example.com')).toBe(false)
    })

    it('should work with match single path', () => {
      const nextConfig = {
        images: {
          remotePatterns: [
            {
              hostname: 'example.com',
              pathname: '/anything/*',
            },
          ],
        },
      }
      expect(isValidRemotePattern(nextConfig, 'https://example.com/anything/1')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://example.com/anything/1/')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://example.com/anything/1/2')).toBe(false)
      expect(isValidRemotePattern(nextConfig, 'https://example.com/something/1/2')).toBe(false)
      expect(isValidRemotePattern(nextConfig, 'https://example.com/anything')).toBe(false)
      expect(isValidRemotePattern(nextConfig, 'https://example.com')).toBe(false)
    })

    it('should work with match any paths', () => {
      const nextConfig = {
        images: {
          remotePatterns: [
            {
              hostname: 'example.com',
              pathname: '/anything/**',
            },
          ],
        },
      }
      expect(isValidRemotePattern(nextConfig, 'https://example.com/anything/1/2')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://example.com/anything/1/2/')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://example.com/anything/1/2/3')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://example.com/anything/1/2/3/')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://example.com/something/1/2')).toBe(false)
      expect(isValidRemotePattern(nextConfig, 'https://example.com/anything')).toBe(false)
      expect(isValidRemotePattern(nextConfig, 'https://example.com')).toBe(false)
    })

    it('should match any path and hostname', () => {
      const nextConfig = {
        images: {
          remotePatterns: [
            {
              hostname: '**',
              pathname: '**',
            },
          ],
        },
      }
      expect(isValidRemotePattern(nextConfig, 'https://example1.com/anything/1/2')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://example2.com/anything/1/2/')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://example3.com/anything/1/2/3')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://example4.com/anything/1/2/3/')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://example5.com/something/1/2')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://example6.com/anything')).toBe(true)
      expect(isValidRemotePattern(nextConfig, 'https://example7.com')).toBe(true)
    })
  })
})
