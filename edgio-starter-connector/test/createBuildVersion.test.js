import { JS_DIR } from '@edgio/core/deploy/paths'
import { FILENAME } from '../src/getBuildVersion'
import { join } from 'path'

describe('createBuildVersion', () => {
  let writeFileSync, createBuildVersion, fs

  beforeEach(() => {
    jest.isolateModules(() => {
      fs = require('../src/fs').default
      writeFileSync = jest.spyOn(fs, 'writeFileSync').mockImplementation()
      jest.spyOn(fs, 'readFileSync').mockImplementation(path => {
        if (path.endsWith('/browser.js')) {
          return 'install()'
        }
      })
      createBuildVersion = require('../src/createBuildVersion').default
    })
  })

  it('should use the hash of browser.js in hex format', () => {
    createBuildVersion()
    expect(writeFileSync).toHaveBeenCalledWith(
      join(process.cwd(), JS_DIR, FILENAME),
      '62068be6ca7c890f241c4562b1f5c58a776a5b28034edd115d52aaec3498dead',
      'utf8'
    )
  })
})
