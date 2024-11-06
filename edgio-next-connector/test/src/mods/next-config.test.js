import { sync as spawnSync } from 'cross-spawn'
import { copyFileSync, ensureDirSync, readFileSync, removeSync, writeFileSync } from 'fs-extra'
import { join } from 'path'
import { beforeEach } from 'node:test'

const nextTransformSrc = 'src/mods/next-config.ts'
const nextDirCopy = './next'
const nextTransformCopy = `${nextDirCopy}/next-config.ts`
const jscodeshiftExecutable = require.resolve('.bin/jscodeshift')

describe('next-config codemod', () => {
  let originalCwd,
    testFile = 'next.config.js'

  function codemod(transform, path) {
    spawnSync(
      jscodeshiftExecutable,
      ['--fail-on-error', '--run-in-band', '--parser=ts', '-t', transform, path],
      {
        stdio: 'inherit',
      }
    )
  }

  function runCodeMod(originalCode) {
    writeFileSync(testFile, originalCode)
    codemod(nextTransformCopy, testFile)
    return readFileSync(testFile).toString()
  }

  function normalize(code) {
    return code.replace(/\s+/g, ' ').trim()
  }

  beforeAll(() => {
    originalCwd = process.cwd(__dirname, '..', '..', '..')
    process.chdir(join())
    ensureDirSync(nextDirCopy)
    copyFileSync(nextTransformSrc, nextTransformCopy)
  })

  beforeEach(() => {
    testFile = 'next.config.js'
  })

  afterEach(() => {
    removeSync(testFile)
    testFile = 'next.config.js'
  })

  afterAll(() => {
    removeSync(nextDirCopy)
    process.cwd(originalCwd)
  })

  it('should work when CommonJS module.exports is an object literal', () => {
    testFile = 'next.config.js'
    const newCode = runCodeMod(`
      module.exports = {
        reactStrictMode: true
      }
    `)
    const expectedCode = `
      // This file was automatically added by edgio init.
      // You should commit this file to source control.
      const { withEdgio } = require('@edgio/next/config')

      const _preEdgioExport = {
        reactStrictMode: true
      };;

      module.exports = (_phase, _config) =>
        withEdgio({
          ..._preEdgioExport
        });
    `
    expect(normalize(newCode)).toEqual(normalize(expectedCode))
  })

  it('should work when ESM export default is an object literal', () => {
    testFile = 'next.config.mjs'
    const newCode = runCodeMod(`
      export default ({
        reactStrictMode: true
      })
    `)
    const expectedCode = `
      // This file was automatically added by edgio init.
      // You should commit this file to source control.
      import { withEdgio } from '@edgio/next/config/index.js'

      const _preEdgioExport = ({
        reactStrictMode: true
      });

      export default (_phase, _config) =>
        withEdgio({
          ..._preEdgioExport
        });
    `
    expect(normalize(newCode)).toEqual(normalize(expectedCode))
  })

  it('should work when CommonJS modules.exports is a variable reference', () => {
    testFile = 'next.config.js'
    const newCode = runCodeMod(`
      const config = {
        reactStrictMode: true
      }

      module.exports = config
    `)
    const expectedCode = `
      // This file was automatically added by edgio init.
      // You should commit this file to source control.
      const { withEdgio } = require('@edgio/next/config')

      const config = {
        reactStrictMode: true
      }

      const _preEdgioExport = config;;

      module.exports = (_phase, _config) =>
        withEdgio({
          ..._preEdgioExport
        });
    `
    expect(normalize(newCode)).toEqual(normalize(expectedCode))
  })

  it('should work when ESM export default is a variable reference', () => {
    testFile = 'next.config.mjs'
    const newCode = runCodeMod(`
      const config = {
        reactStrictMode: true
      }

      export default config
    `)
    const expectedCode = `
      // This file was automatically added by edgio init.
      // You should commit this file to source control.
      import { withEdgio } from '@edgio/next/config/index.js'

      const config = {
        reactStrictMode: true
      }

      const _preEdgioExport = config;

      export default (_phase, _config) =>
        withEdgio({
          ..._preEdgioExport
        });
    `
    expect(normalize(newCode)).toEqual(normalize(expectedCode))
  })

  it('should work when CommonJS modules.exports is a function', () => {
    testFile = 'next.config.js'
    const newCode = runCodeMod(`
      const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

      module.exports = (phase, { defaultConfig }) => {
        if (phase === PHASE_DEVELOPMENT_SERVER) {
          return { reactStrictMode: true }
        }

        return {
          reactStrictMode: false
        }
      };
    `)
    const expectedCode = `
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

      module.exports = (_phase, _config) =>
        withEdgio({
          ..._preEdgioExport(_phase, _config)
        });
    `
    expect(normalize(newCode)).toEqual(normalize(expectedCode))
  })

  it('should work when ESM export default is a function', () => {
    testFile = 'next.config.mjs'
    const newCode = runCodeMod(`
      import { PHASE_DEVELOPMENT_SERVER } from 'next/constants'

      export default (phase, { defaultConfig }) => {
        if (phase === PHASE_DEVELOPMENT_SERVER) {
          return { reactStrictMode: true }
        }

        return {
          reactStrictMode: false
        }
      };
    `)
    const expectedCode = `
      // This file was automatically added by edgio init.
      // You should commit this file to source control.
      import { withEdgio } from '@edgio/next/config/index.js'
      import { PHASE_DEVELOPMENT_SERVER } from 'next/constants'

      const _preEdgioExport = (phase, { defaultConfig }) => {
        if (phase === PHASE_DEVELOPMENT_SERVER) {
          return { reactStrictMode: true }
        }

        return {
          reactStrictMode: false
        }
      };

      export default (_phase, _config) =>
        withEdgio({
          ..._preEdgioExport(_phase, _config)
        });
    `
    expect(normalize(newCode)).toEqual(normalize(expectedCode))
  })

  it('should work with Typescript', () => {
    testFile = 'next.config.ts'
    const newCode = runCodeMod(`
      import type { NextConfig } from "next";
      
      export interface MyNextConfig extends NextConfig {
        reactStrictMode: boolean
      }

      export default (phase: string, config: NextConfig): MyNextConfig => {
        return {
          reactStrictMode: false
        }
      };
    `)
    const expectedCode = `
      // This file was automatically added by edgio init.
      // You should commit this file to source control.
      import { withEdgio } from '@edgio/next/config'
      import type { NextConfig } from "next";
      
      export interface MyNextConfig extends NextConfig {
        reactStrictMode: boolean
      }

      const _preEdgioExport = (phase: string, config: NextConfig): MyNextConfig => {
        return {
          reactStrictMode: false
        }
      };
      
      export default (_phase: string, _config: any) =>
        withEdgio({
          ..._preEdgioExport(_phase, _config)
        });
    `
    expect(normalize(newCode)).toEqual(normalize(expectedCode))
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
    const expectedCode = `
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

      module.exports = (_phase, _config) =>
        withEdgio({
          ..._preEdgioExport
        });
    `
    expect(normalize(newCode)).toEqual(normalize(expectedCode))
  })

  it('should not apply transformation multiple times', () => {
    const newCode = runCodeMod(`
    // This file was automatically added by edgio init.
    // You should commit this file to source control.
    const { withEdgio } = require('@edgio/next/config')
    
    module.exports = (phase, config) =>
      withEdgio({});
    `)
    const expectedCode = `
    // This file was automatically added by edgio init.
    // You should commit this file to source control.
    const { withEdgio } = require('@edgio/next/config')
    
    module.exports = (phase, config) =>
      withEdgio({});
    `
    expect(normalize(newCode)).toEqual(normalize(expectedCode))
  })
})
