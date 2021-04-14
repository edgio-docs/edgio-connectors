import createWebpackConfig from '../src/createWebpackConfig'

describe('createWebpackConfig', () => {
  it('should accept overrides', () => {
    expect(createWebpackConfig({ mode: 'production' }).mode).toBe('production')
  })
  it('should not require overrides', () => {
    expect(createWebpackConfig().mode).toBe('development')
  })
})
