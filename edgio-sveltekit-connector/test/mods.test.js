import { sync as spawnSync } from 'cross-spawn'
import { readFileSync, removeSync, writeFileSync } from 'fs-extra'

const transform = 'src/mods/svelte-config.ts'
const jscodeshiftExecutable = require.resolve('.bin/jscodeshift')
const TEST_FILE = './test.js'

function codemod(transform, path) {
  spawnSync(jscodeshiftExecutable, ['-t', transform, path], {
    stdio: 'inherit',
  })
}

function runCodeMod(originalCode) {
  writeFileSync(TEST_FILE, originalCode)
  codemod(transform, TEST_FILE)
  return readFileSync(TEST_FILE).toString()
}

describe('svelte-config codemod', () => {
  afterEach(() => {
    removeSync(TEST_FILE)
  })

  it('should set adapter to edgio', () => {
    const newCode = runCodeMod(`
      /** @type {import('@sveltejs/kit').Config} */
      const config = {
        kit: {
          // hydrate the <div id="svelte"> element in src/app.html
          target: '#svelte'
        }
      };
      
      export default config;
    `)
    expect(newCode.trim()).toEqual(`import createAdapter from '@edgio/sveltekit/adapter.js';
      /** @type {import('@sveltejs/kit').Config} */
      const config = {
        kit: {
          // hydrate the <div id="svelte"> element in src/app.html
          target: '#svelte'
        }
      };

      const _oldExport = config;
      _oldExport.kit.adapter = createAdapter();
      export default _oldExport`)
  })
})
