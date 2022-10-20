export const mockRequest = () => {
  const request = {
    url: '/',
    headers: {
      host: 'domain.com',
    },
    on: (event, cb) => {
      if (event === 'data') {
        setImmediate(() => cb(request.body))
      } else if (event === 'end') {
        setImmediate(cb)
      }
    },
  }

  return request
}

export const mockResponse = (responseHeaders = {}) => ({
  writeHead: jest.fn(),
  end: jest.fn(),
  setHeader: jest.fn((header, value) => {
    responseHeaders[header] = value
  }),
  getHeaders: jest.fn(() => []),
})
