import { existsSync, readFileSync } from 'fs'

const BUILD_ID = 'build-id'

describe('injectBrowserScript', () => {
  let injectBrowserScript, fs

  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('production', () => {
    beforeEach(() => {
      jest.resetAllMocks()
      jest.isolateModules(() => {
        fs = require('../src/fs').default
        jest.spyOn(fs, 'existsSync').mockImplementation(path => {
          if (path.endsWith('/BUILD_ID')) {
            return true
          } else {
            return existsSync(path)
          }
        })

        jest.spyOn(fs, 'readFileSync').mockImplementation((path, ...others) => {
          if (path.endsWith('/BUILD_ID')) {
            return BUILD_ID
          } else {
            return readFileSync(path, ...others)
          }
        })

        injectBrowserScript = require('../src/injectBrowserScript').default
      })
    })

    it('should add browser.js to the head', () => {
      const response = {
        body: `<!doctype html><html><head></head></html>`,
        getHeader: _ => 'text/html',
      }
      injectBrowserScript(response)
      expect(response.body).toMatch(
        `<!DOCTYPE html><html><head><script src="/__edgio__/${BUILD_ID}/browser.js" defer=""></script></head><body></body></html>`
      )
    })
  })

  describe('development', () => {
    beforeEach(() => {
      injectBrowserScript = require('../src/injectBrowserScript').default
    })

    it('should add browser.js to the head', () => {
      const response = {
        body: `<!doctype html><html><head></head></html>`,
        getHeader: _ => 'text/html',
      }
      injectBrowserScript(response)
      expect(response.body).toMatch(
        '<!DOCTYPE html><html><head><script src="/__edgio__/development/browser.js" defer=""></script></head><body></body></html>'
      )
    })

    it('should not require a body', () => {
      const response = {}
      injectBrowserScript(response)
    })
  })
})
