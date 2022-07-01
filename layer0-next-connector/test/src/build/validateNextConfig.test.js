describe('validateNextConfig', () => {
  let validateNextConfig, nextConfig, exit, error

  beforeEach(() => {
    jest.isolateModules(() => {
      exit = jest.spyOn(process, 'exit').mockImplementation()
      error = jest.spyOn(console, 'error').mockImplementation()
      jest.doMock('../../../src/build/getNextConfig', () => _appDir => nextConfig)
      validateNextConfig = require('../../../src/build/validateNextConfig').default
    })
  })

  afterEach(() => {
    exit.mockRestore()
  })

  it('should exit if withLayer0 is not applied (object)', () => {
    nextConfig = {}
    validateNextConfig('.')
    expect(error).toHaveBeenCalled()
    expect(exit).toHaveBeenCalledWith(1)
  })

  it('should exit if withLayer0 is not applied (function)', () => {
    nextConfig = () => ({})
    validateNextConfig('.')
    expect(error).toHaveBeenCalled()
    expect(exit).toHaveBeenCalledWith(1)
  })

  it('should not exit if withLayer0 is applied (object)', () => {
    nextConfig = { withLayer0Applied: true }
    validateNextConfig('.')
    expect(error).not.toHaveBeenCalled()
    expect(exit).not.toHaveBeenCalled()
  })

  it('should not exit if withLayer0 is applied (function)', () => {
    nextConfig = () => ({ withLayer0Applied: true })
    validateNextConfig('.')
    expect(error).not.toHaveBeenCalled()
    expect(exit).not.toHaveBeenCalled()
  })
})
