import { transformConfigFile } from '../../../src/frameworks/sveltekit/utils'
import { mkdirSync, rmSync, copySync, existsSync, readFileSync } from 'fs-extra'
import { join } from 'path'

describe('init.ts', () => {
  const sandboxDir = join(__dirname, 'sandbox')
  const originalCwd = process.cwd()

  beforeAll(() => {
    if (!existsSync(sandboxDir)) mkdirSync(sandboxDir)
    copySync(join(__dirname, 'apps', 'default'), sandboxDir, {
      overwrite: true,
    })
    process.chdir(sandboxDir)
  })

  it('should replace default adapter by @edgio/connectors/frameworks/sveltekit/adapter.js in svelte.config.js file', () => {
    transformConfigFile()
    const newConfig = readFileSync('svelte.config.js', 'utf-8').toString()
    expect(newConfig).toEqual(
      `import adapter from '@edgio/connectors/frameworks/sveltekit/adapter.js'\n` +
        `/** @type {import('@sveltejs/kit').Config} */\n` +
        `const config = {\n` +
        `  kit: {\n` +
        `    adapter: adapter(),\n` +
        `  },\n` +
        `}\n` +
        `export default config\n`
    )
  })

  afterAll(() => {
    rmSync(sandboxDir, {
      recursive: true,
      force: true,
    })
    process.chdir(originalCwd)
  })
})
