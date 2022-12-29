import getDistDir from '../../../src/util/getDistDir'
import { join } from 'path'
import getNextConfig from '../../../src/getNextConfig'
import withOffline from 'next-offline'

describe('withServiceWorkerInternal', () => {
  let withOfflineMock, withServiceWorkerInternal

  beforeEach(() => {
    jest.isolateModules(() => {
      withOfflineMock = jest.fn(withOffline)
      process.chdir(join(__dirname, '..', '..', 'apps', 'with-service-worker'))
      jest.spyOn(console, 'log').mockImplementation(() => {})
      jest.doMock('next-offline', () => withOfflineMock)
      withServiceWorkerInternal = require('../../../src/sw/withServiceWorkerInternal').default
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('withServiceWorker returns correct workboxOpts', () => {
    it('should return workboxOpts', () => {
      const nextConfig = getNextConfig()
      expect(typeof nextConfig).toBe('object')
      withServiceWorkerInternal(nextConfig)

      const updatedNextConfig = withOfflineMock.mock.calls[0][0]
      expect(typeof updatedNextConfig).toBe('object')

      const workboxOpts = updatedNextConfig.workboxOpts
      expect(typeof workboxOpts).toBe('object')

      const distDir = getDistDir()
      const appRoot = process.cwd()

      const swSrc = appRoot + '/sw/service-worker.js'
      const swDest = appRoot + `/${distDir}/static/service-worker.js`

      expect(workboxOpts.swSrc).toBe(swSrc)
      expect(workboxOpts.swDest).toBe(swDest)

      expect(workboxOpts.manifestTransforms.length).toBeGreaterThan(0)
      const transformFunctions = workboxOpts.manifestTransforms

      for (const func of transformFunctions) {
        expect(typeof func).toBe('function')
      }
    })

    it('transformFunction corrects double slashes', () => {
      const nextConfig = getNextConfig()
      withServiceWorkerInternal(nextConfig)

      const updatedNextConfig = withOfflineMock.mock.calls[0][0]
      const transformFunctions = updatedNextConfig.workboxOpts.manifestTransforms
      const appRoot = process.cwd()

      // Example data which is representing passed self.__WB_MANIFEST variable in /sw/service-worker.js file
      let exampleUrls = require(`${appRoot}/example-manifest.json`)
      let exampleUrlsOriginalLength = exampleUrls.length

      // Run URLs through functions
      transformFunctions.forEach(func => {
        exampleUrls = func(exampleUrls).manifest
      })

      // Check that new length is the same as the original one
      expect(exampleUrls.length).toBe(exampleUrlsOriginalLength)

      exampleUrls.forEach(item => {
        expect(item.url.includes('//')).toBe(false)
      })
    })

    it('transformFunction returns correctly encoded URLs', () => {
      const nextConfig = getNextConfig()
      withServiceWorkerInternal(nextConfig)

      const updatedNextConfig = withOfflineMock.mock.calls[0][0]
      const transformFunctions = updatedNextConfig.workboxOpts.manifestTransforms

      // Example data which is representing passed self.__WB_MANIFEST variable in /sw/service-worker.js file
      let exampleUrls = [
        {
          url: '/api/endpoint?param=Long sentence with spaces and special " ` chars, which should be encoded',
          revision: 'cc654fefba9a52fc1a3f6e78c0fd4a25',
          size: 104,
        },
      ]
      let exampleUrlsCopy = exampleUrls.map(item => ({ ...item }))
      let exampleUrlsOriginalLength = exampleUrls.length

      // Run URLs through functions
      transformFunctions.forEach(func => {
        exampleUrls = func(exampleUrls).manifest
      })

      // Check that new length is the same as the original one
      expect(exampleUrls.length).toBe(exampleUrlsOriginalLength)

      exampleUrls.forEach((item, index) => {
        expect(item.url).toBe(encodeURI(exampleUrlsCopy[index].url))
        expect(() => {
          new URL(`https://example.com${item.url}`)
        }).not.toThrow()
      })
    })
  })
})
