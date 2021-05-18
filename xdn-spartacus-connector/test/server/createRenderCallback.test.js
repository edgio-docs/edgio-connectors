import { BACKEND_REQUESTS_RESPONSE_HEADER_NAME } from '@xdn/prefetch/constants'
import getNamespace from '../../src/server/getNamespace'
import createRenderCallback from '../../src/server/createRenderCallback'
import { MockResponse } from '../mocks'

describe('createRenderCallback', () => {
  let ns, response, callback

  beforeEach(() => {
    response = new MockResponse()
    ns = getNamespace()
  })

  it('should add SSR requests to the BACKEND_REQUESTS_RESPONSE_HEADER_NAME header', () => {
    ns.run(() => {
      ns.set('requests', new Set(['req1', 'req2']))
      callback = createRenderCallback(response)
    })
    callback()
    expect(response.headers.get(BACKEND_REQUESTS_RESPONSE_HEADER_NAME)).toBe('req1;req2;')
  })

  it('should set the BACKEND_REQUESTS_RESPONSE_HEADER_NAME to empty if there are no SSR requests', () => {
    ns.run(() => {
      callback = createRenderCallback(response)
    })
    callback()
    expect(response.headers.get(BACKEND_REQUESTS_RESPONSE_HEADER_NAME)).toBe('')
  })

  it('should enforce maxHeaderLength', () => {
    ns.run(() => {
      ns.set('requests', new Set(['req1', 'req2', 'aReallyLongRequestURLToTruncate']))
      callback = createRenderCallback(response, { maxHeaderLength: 10 })
    })
    callback()
    expect(response.headers.get(BACKEND_REQUESTS_RESPONSE_HEADER_NAME)).toBe('req1;req2;')
  })
})
