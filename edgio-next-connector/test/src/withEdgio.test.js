describe('withEdgio', () => {
  let withEdgio, mockApplyPlugins, mockExistsValue
  const nextConfig = { distDir: '.output' }

  beforeAll(() => {
    jest.resetAllMocks()
    jest.isolateModules(() => {
      mockApplyPlugins = jest.fn(nextConfig => nextConfig)
      jest.mock('../../src/plugins/applyPlugins', () => ({
        default: mockApplyPlugins,
      }))
      jest.mock('../../src/util/nextRuntimeConfigExists', () => jest.fn(() => mockExistsValue))
      withEdgio = require('../../src/withEdgio')
    })
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  it("should call applyPlugins when next.config.runtime.js file doesn't exist", () => {
    mockExistsValue = false
    expect(withEdgio(nextConfig)).toEqual(nextConfig)
    expect(mockApplyPlugins).toHaveBeenCalled()
  })

  it('should not call applyPlugins when next.config.runtime.js file exists', () => {
    mockExistsValue = true
    expect(withEdgio(nextConfig)).toEqual(nextConfig)
    expect(mockApplyPlugins).not.toHaveBeenCalled()
  })
})
