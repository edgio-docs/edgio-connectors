/* istanbul ignore file */
import { join } from 'path'
import { DeploymentBuilder } from '@edgio/core/deploy'
import { existsSync, readFileSync, writeFileSync } from 'fs'

/**
 * Adds all required dependencies and files to the user's app by copying them
 * over from src/default-app.
 */
export default async function init() {
  const builder = new DeploymentBuilder(process.cwd())
  builder.addDefaultAppResources(join(__dirname, 'default-app')).addDefaultEdgioScripts()
  transformConfigFile()
}

/**
 * Transforms the user's svelte.config.js, so it uses the Edgio adapter.
 * This action is not required for deployment to edgio,
 * but it will hide the warnings from Sveltekit during the build.
 */
export function transformConfigFile() {
  const configFile = [
    'svelte.config.js',
    'svelte.config.cjs',
    'svelte.config.mjs',
    'svelte.config.ts',
  ].find(existsSync)

  if (!configFile) {
    console.log('no config')
    return
  }
  let sourceCode = readFileSync(configFile, 'utf-8').toString()

  // Do not transform the config file multiple times
  if (sourceCode.indexOf('@edgio') !== -1) return

  // When file is using any of default adapters, we can just replace it with edgio adapter.
  // Example: import adapter from '@sveltejs/adapter-auto'
  // Example: import anyAdapter from '@sveltejs/adapter-vercel'
  const defaultImportPattern = /import (.+) from ('|"|`)@sveltejs\/adapter-(.+)('|"|`)/m
  const edgioImport = "import $1 from '@edgio/sveltekit/adapter.js'"

  // Rather do not transform the config file at all if it's not using default adapter.
  if (!sourceCode.match(defaultImportPattern)) return

  sourceCode = sourceCode.replace(defaultImportPattern, edgioImport)
  writeFileSync(configFile, sourceCode)
}
