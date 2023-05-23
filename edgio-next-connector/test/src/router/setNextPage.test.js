import setNextPage from '../../../src/router/setNextPage'
import { NEXT_PAGE_HEADER } from '../../../src/constants'

describe('setNextPage', () => {
  let routeHelper, mockSetRequestHeader

  beforeAll(() => {
    mockSetRequestHeader = jest.fn()
    routeHelper = {
      setRequestHeader: mockSetRequestHeader,
    }
  })

  it('should set "x-next-page" request header with page name', () => {
    setNextPage('404', routeHelper)
    expect(mockSetRequestHeader).toHaveBeenCalledWith(NEXT_PAGE_HEADER, '404')
  })

  it('should set "x-next-page" request header with page name and remove leading slash', () => {
    setNextPage('/dynamic/[id]', routeHelper)
    expect(mockSetRequestHeader).toHaveBeenCalledWith(NEXT_PAGE_HEADER, 'dynamic/[id]')
  })

  it('should set "x-next-page" request header with page name and replace / with index', () => {
    setNextPage('/', routeHelper)
    expect(mockSetRequestHeader).toHaveBeenCalledWith(NEXT_PAGE_HEADER, 'index')
  })
})
