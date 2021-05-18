export class MockRequest {
  constructor(url, { headers = new Headers(), method = 'GET', body, redirect } = {}) {
    this.url = url
    this.headers = headers
    this.method = method
    this.body = body
    this.redirect = redirect
  }
  clone() {
    return new MockRequest(this.url, {
      headers: this.headers,
      method: this.method,
      body: this.body,
    })
  }
  text() {
    return this.body
  }
  on() {}
  emit() {}
  addListener() {}
  removeListener() {}
}

export class MockResponse {
  constructor(init) {
    Object.assign(this, { headers: new Headers() }, init)
  }

  get(headerName) {
    return this.headers.get(headerName)
  }

  set(headerName, headerValue) {
    this.headers.set(headerName, headerValue)
  }

  send(content) {
    return content
  }
  on() {}
  emit() {}
  addListener() {}
  removeListener() {}
}

export class Express {
  constructor(init) {
    Object.assign(this, init)
  }

  use(callback) {
    this.requestCallback = callback
  }

  request(url) {
    this.requestCallback(new MockRequest(url), new MockResponse(), () => null)
  }
}

export const http = {
  request: () => {},
}

export const https = {
  request: () => {},
}
