describe('validateNextConfig', () => {
  let validateNextConfig, nextConfig, exit, error

  beforeEach(() => {
    jest.isolateModules(() => {
      nextConfig = {}
      exit = jest.spyOn(process, 'exit').mockImplementation()
      error = jest.spyOn(console, 'error').mockImplementation()
      jest.doMock('../../../src/getNextConfig', () => _appDir => nextConfig)
      validateNextConfig = require('../../../src/build/validateNextConfig').default
    })
  })

  afterEach(() => {
    exit.mockRestore()
  })

  it('should exit if withLayer0 is not applied (object)', () => {
    validateNextConfig('.')
    expect(error).toHaveBeenCalled()
    expect(exit).toHaveBeenCalledWith(1)
  })

  it('should exit if withLayer0 is not applied (function)', () => {
    validateNextConfig('.')
    expect(error).toHaveBeenCalled()
    expect(exit).toHaveBeenCalledWith(1)
  })

  describe('withLayer0 applied', () => {
    beforeEach(() => {
      process.env.WITH_LAYER0_APPLIED = 'true'
    })

    afterEach(() => {
      delete process.env.WITH_LAYER0_APPLIED
    })

    it('should not exit if withLayer0 is applied (object)', () => {
      validateNextConfig('.')
      expect(error).not.toHaveBeenCalled()
      expect(exit).not.toHaveBeenCalled()
    })

    it('should not exit if withLayer0 is applied (function)', () => {
      process.env.WITH_LAYER0_APPLIED = 'true'
      validateNextConfig('.')
      expect(error).not.toHaveBeenCalled()
      expect(exit).not.toHaveBeenCalled()
    })
  })
})
