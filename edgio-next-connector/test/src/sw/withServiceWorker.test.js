import { join } from 'path'
import fs from 'fs'
import { NEXT_RUNTIME_CONFIG_FILE } from '../../../src/config/constants'

describe('withServiceWorker', () => {
  let withServiceWorker, withServiceWorkerInternalMock

  beforeEach(() => {
    jest.isolateModules(() => {
      withServiceWorkerInternalMock = jest.fn(_nextConfig => {})
      process.chdir(join(__dirname, '..', '..', 'apps', 'with-service-worker'))
      jest.spyOn(console, 'log').mockImplementation(() => {})
      jest.doMock('../../../src/sw/withServiceWorkerInternal', () => ({
        default: withServiceWorkerInternalMock,
      }))
      withServiceWorker = require('../../../src/sw').withServiceWorker
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  afterAll(() => {
    fs.unlinkSync(join(process.cwd(), NEXT_RUNTIME_CONFIG_FILE))
  })

  it('should call withServiceWorkerInternal', () => {
    withServiceWorker({})
    expect(withServiceWorkerInternalMock).toBeCalled()
  })

  it('should not call withServiceWorkerInternal', () => {
    fs.writeFileSync(join(process.cwd(), NEXT_RUNTIME_CONFIG_FILE), '{}')
    const nextConfig = {
      distDir: 'customBuildDir',
    }
    expect(withServiceWorker(nextConfig)).toBe(nextConfig)
    expect(withServiceWorkerInternalMock).not.toBeCalled()
  })
})
