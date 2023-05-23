import { sync as spawnSync } from 'cross-spawn'
import { copyFileSync, ensureDirSync, readFileSync, removeSync, writeFileSync } from 'fs-extra'
import { join } from 'path'

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
  let originalCwd
  beforeAll(() => {
    originalCwd = process.cwd(__dirname, '..', '..', '..')
    process.chdir(join())
    ensureDirSync(nextDirCopy)
    copyFileSync(nextTransformSrc, nextTransformCopy)
  })

  afterEach(() => {
    removeSync(TEST_FILE)
  })

  afterAll(() => {
    removeSync(nextDirCopy)
    process.cwd(originalCwd)
  })

  it('should handle when module.exports is an object literal (module.exports = { prop: true })', () => {
    const newCode = runCodeMod(`
      module.exports = {
        reactStrictMode: true
      }
    `)
    expect(newCode).toEqual(`
      // This file was automatically added by edgio init.
      // You should commit this file to source control.
      const { withEdgio } = require('@edgio/next/config')

      const _preEdgioExport = {
        reactStrictMode: true
      };;

      module.exports = (phase, config) =>
        withEdgio({
          ..._preEdgioExport
        })
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
      // This file was automatically added by edgio init.
      // You should commit this file to source control.
      const { withEdgio } = require('@edgio/next/config')

      const config = {
        reactStrictMode: true
      }

      const _preEdgioExport = config;;

      module.exports = (phase, config) =>
        withEdgio({
          ..._preEdgioExport
        })
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
      // This file was automatically added by edgio init.
      // You should commit this file to source control.
      const { withEdgio } = require('@edgio/next/config')

      const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

      const _preEdgioExport = (phase, { defaultConfig }) => {
        if (phase === PHASE_DEVELOPMENT_SERVER) {
          return { reactStrictMode: true }
        }

        return {
          reactStrictMode: false
        }
      };;

      module.exports = (phase, config) =>
        withEdgio({
          ..._preEdgioExport(phase, config)
        })
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
      // This file was automatically added by edgio init.
      // You should commit this file to source control.
      const { withEdgio } = require('@edgio/next/config')

      const util = arg => arg + '123'

      const _preEdgioExport = {
        reactStrictMode: true,
        prop1: util('test'),
        prop2: util2('test'),
      };;

      const util2 = function(arg) {
        return arg + '321'
      }

      module.exports = (phase, config) =>
        withEdgio({
          ..._preEdgioExport
        })
    `)
  })

  it('should not apply transformation multiple times', () => {
    const newCode = runCodeMod(`
    // This file was automatically added by edgio init.
    // You should commit this file to source control.
    const { withEdgio } = require('@edgio/next/config')
    
    module.exports = (phase, config) =>
      withEdgio({})
    `)
    expect(newCode).toEqual(`
    // This file was automatically added by edgio init.
    // You should commit this file to source control.
    const { withEdgio } = require('@edgio/next/config')
    
    module.exports = (phase, config) =>
      withEdgio({})
    `)
  })
})
