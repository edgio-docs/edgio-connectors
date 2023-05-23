import { RENDER_MODES } from '../../../src/types'

describe('renderNextPage', () => {
  let routeHelper, renderNextPage, mockSetOrigin, mockSetRequestHeader, mockRenderModeValue

  beforeAll(() => {
    jest.resetAllMocks()
    jest.isolateModules(() => {
      mockSetRequestHeader = jest.fn()
      mockSetOrigin = jest.fn()
      routeHelper = {
        setOrigin: mockSetOrigin,
        setRequestHeader: mockSetRequestHeader,
      }
      jest.mock('../../../src/getNextConfig', () => jest.fn(() => {}))
      jest.mock('../../../src/util/getRenderMode', () => jest.fn(() => mockRenderModeValue))
      renderNextPage = require('../../../src/router/renderNextPage').renderNextPage
    })
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  it('should throw exception for SERVER render mode', () => {
    mockRenderModeValue = RENDER_MODES.server
    expect(() => {
      renderNextPage('404', routeHelper)
    }).toThrow()
  })

  it('should set origin and "x-next-page" request header for SERVERLESS render mode', () => {
    mockRenderModeValue = RENDER_MODES.serverless
    renderNextPage('404', routeHelper)
    expect(mockSetOrigin).toHaveBeenCalled()
    expect(mockSetRequestHeader).toHaveBeenCalled()
  })
})
