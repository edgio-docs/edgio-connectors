import { sortRoutes } from '../../../src/router/NextRoutes'

describe('sortRoutes', () => {
  it('sorts static routes in front of dynamic routes', () => {
    const dynamicRoutes = [{ page: 'dynamic1' }, { page: 'dynamic2' }]
    const pages = ['dynamic1', 'static1', 'static2', 'dynamic2']
    const routesManifest = { dynamicRoutes }
    expect(sortRoutes(pages, routesManifest)).toEqual([
      'static1',
      'static2',
      'dynamic1',
      'dynamic2',
    ])
  })

  it('keeps the order of dynamic routes as specified in routes manifest', () => {
    const dynamicRoutes = [{ page: 'dynamic2' }, { page: 'dynamic1' }]
    const pages = ['dynamic1', 'static1', 'static2', 'dynamic2']
    const routesManifest = { dynamicRoutes }
    expect(sortRoutes(pages, routesManifest)).toEqual([
      'static1',
      'static2',
      'dynamic2',
      'dynamic1',
    ])
  })
})
