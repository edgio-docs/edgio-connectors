import { JS_DIR } from '@xdn/core/deploy/paths'
import fs from '../src/fs'
import { FILENAME } from '../src/getBuildVersion'
import { join } from 'path'

describe('createBuildVersion', () => {
  let writeFileSync, createBuildVersion

  beforeEach(() => {
    jest.isolateModules(() => {
      writeFileSync = jest.spyOn(fs, 'writeFileSync').mockImplementation()
      jest.spyOn(fs, 'readFileSync').mockImplementation(path => {
        if (path.endsWith('/browser.js')) {
          return 'install()'
        }
      })
      createBuildVersion = require('../src/createBuildVersion').default
    })
  })

  it('should use the hash of browser.js', () => {
    createBuildVersion()
    expect(writeFileSync).toHaveBeenCalledWith(
      join(process.cwd(), JS_DIR, FILENAME),
      'YgaL5sp8iQ8kHEVisfXFindqWygDTt0RXVKq7DSY3q0=',
      'utf8'
    )
  })
})
