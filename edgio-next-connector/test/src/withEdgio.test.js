describe('withEdgio', () => {
  let withEdgio, mockApplyPlugins, mockIsCloud, mockIsProductionBuild
  const nextConfig = { distDir: '.output' }

  beforeAll(() => {
    jest.resetAllMocks()
    jest.isolateModules(() => {
      mockApplyPlugins = jest.fn(nextConfig => nextConfig)
      jest.mock('../../src/plugins/applyPlugins', () => ({
        default: mockApplyPlugins,
      }))
      jest.mock('@edgio/core/environment', () => ({
        isCloud: () => mockIsCloud,
        isProductionBuild: () => mockIsProductionBuild,
      }))
      withEdgio = require('../../src/withEdgio')
    })
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  it("should call applyPlugins when we're not running production build", () => {
    mockIsCloud = false
    mockIsProductionBuild = false
    expect(withEdgio(nextConfig)).toEqual(nextConfig)
    expect(mockApplyPlugins).toHaveBeenCalled()
  })

  it("should not call applyPlugins when we're running production build", () => {
    mockIsCloud = true
    mockIsProductionBuild = true
    expect(withEdgio(nextConfig)).toEqual(nextConfig)
    expect(mockApplyPlugins).not.toHaveBeenCalled()
  })
})
