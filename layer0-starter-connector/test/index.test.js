import { starterRoutes, injectBrowserScript } from '../src'

describe('index', () => {
  it('should export starterRoutes', () => {
    expect(starterRoutes).toBeDefined()
  })
  it('should export injectBrowserScript', () => {
    expect(injectBrowserScript).toBeDefined()
  })
})
