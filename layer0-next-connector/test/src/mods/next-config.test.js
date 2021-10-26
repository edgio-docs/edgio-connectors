import { sync as spawnSync } from 'cross-spawn'
import { copyFileSync, mkdirSync, readFileSync, removeSync, writeFileSync } from 'fs-extra'

const nextTransformSrc = 'src/mods/next-config.ts'
const nextDirCopy = './next'
const nextTransformCopy = `${nextDirCopy}/next-config.ts`
const jscodeshiftExecutable = require.resolve('.bin/jscodeshift')

function codemod(transform, path) {
  spawnSync(jscodeshiftExecutable, ['-t', transform, path], {
    stdio: 'inherit',
  })
}

function runCodeMod(originalCode) {
  writeFileSync(TEST_FILE, originalCode)
  codemod(nextTransformCopy, TEST_FILE)
  return readFileSync(TEST_FILE).toString()
}

const TEST_FILE = './next.config.js'

describe('next-config codemod', () => {
  beforeAll(() => {
    mkdirSync(nextDirCopy)
    copyFileSync(nextTransformSrc, nextTransformCopy)
  })

  afterEach(() => {
    removeSync(TEST_FILE)
  })

  afterAll(() => {
    removeSync(nextDirCopy)
  })

  it('should handle when module.exports is an object literal (module.exports = { prop: true })', () => {
    const newCode = runCodeMod(`
      module.exports = {
        reactStrictMode: true
      }
    `)
    expect(newCode).toEqual(`
      // This file was automatically added by layer0 init.
      // You should commit this file to source control.
      const { withLayer0, withServiceWorker } = require('@layer0/next/config')

      const _preLayer0Export = {
        reactStrictMode: true
      };;

      module.exports = (phase, config) =>
        withLayer0(
          withServiceWorker({
            // Output sourcemaps so that stack traces have original source filenames and line numbers when tailing
            // the logs in the Layer0 developer console.
            layer0SourceMaps: true,

            ..._preLayer0Export
          })
        )
    `)
  })

  it('should handle when modules.exports is a variable reference (module.exports = varName)', () => {
    const newCode = runCodeMod(`
      const config = {
        reactStrictMode: true
      }
      
      module.exports = config
    `)
    expect(newCode).toEqual(`
      // This file was automatically added by layer0 init.
      // You should commit this file to source control.
      const { withLayer0, withServiceWorker } = require('@layer0/next/config')

      const config = {
        reactStrictMode: true
      }

      const _preLayer0Export = config;;

      module.exports = (phase, config) =>
        withLayer0(
          withServiceWorker({
            // Output sourcemaps so that stack traces have original source filenames and line numbers when tailing
            // the logs in the Layer0 developer console.
            layer0SourceMaps: true,

            ..._preLayer0Export
          })
        )
    `)
  })

  it('should handle when modules.exports is a function', () => {
    const newCode = runCodeMod(`
      const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

      module.exports = (phase, { defaultConfig }) => {
        if (phase === PHASE_DEVELOPMENT_SERVER) {
          return { reactStrictMode: true }
        }

        return {
          reactStrictMode: false
        }
      }
    `)
    expect(newCode).toEqual(`
      // This file was automatically added by layer0 init.
      // You should commit this file to source control.
      const { withLayer0, withServiceWorker } = require('@layer0/next/config')

      const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

      const _preLayer0Export = (phase, { defaultConfig }) => {
        if (phase === PHASE_DEVELOPMENT_SERVER) {
          return { reactStrictMode: true }
        }

        return {
          reactStrictMode: false
        }
      };;

      module.exports = (phase, config) =>
        withLayer0(
          withServiceWorker({
            // Output sourcemaps so that stack traces have original source filenames and line numbers when tailing
            // the logs in the Layer0 developer console.
            layer0SourceMaps: true,

            ..._preLayer0Export(phase, config)
          })
        )
    `)
  })

  it('should keep all existing code in the current next.config.js file', () => {
    const newCode = runCodeMod(`
      const util = arg => arg + '123'

      module.exports = {
        reactStrictMode: true,
        prop1: util('test'),
        prop2: util2('test'),
      }

      const util2 = function(arg) {
        return arg + '321'
      }
    `)
    expect(newCode).toEqual(`
      // This file was automatically added by layer0 init.
      // You should commit this file to source control.
      const { withLayer0, withServiceWorker } = require('@layer0/next/config')

      const util = arg => arg + '123'

      const _preLayer0Export = {
        reactStrictMode: true,
        prop1: util('test'),
        prop2: util2('test'),
      };;

      const util2 = function(arg) {
        return arg + '321'
      }

      module.exports = (phase, config) =>
        withLayer0(
          withServiceWorker({
            // Output sourcemaps so that stack traces have original source filenames and line numbers when tailing
            // the logs in the Layer0 developer console.
            layer0SourceMaps: true,

            ..._preLayer0Export
          })
        )
    `)
  })

  it('should not apply transformation multiple times', () => {
    const newCode = runCodeMod(`
    // This file was automatically added by layer0 init.
    // You should commit this file to source control.
    const { withLayer0, withServiceWorker } = require('@layer0/next/config')
    
    module.exports = (phase, config) =>
      withLayer0(
        withServiceWorker({
          // Output sourcemaps so that stack traces have original source filenames and line numbers when tailing
          // the logs in the Layer0 developer console.
          layer0SourceMaps: true,
        })
      )
    `)
    expect(newCode).toEqual(`
    // This file was automatically added by layer0 init.
    // You should commit this file to source control.
    const { withLayer0, withServiceWorker } = require('@layer0/next/config')
    
    module.exports = (phase, config) =>
      withLayer0(
        withServiceWorker({
          // Output sourcemaps so that stack traces have original source filenames and line numbers when tailing
          // the logs in the Layer0 developer console.
          layer0SourceMaps: true,
        })
      )
    `)
  })
})
