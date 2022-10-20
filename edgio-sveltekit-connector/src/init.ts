/* istanbul ignore file */
const { join } = require('path')
const { DeploymentBuilder } = require('@edgio/core/deploy')
const spawn = require('cross-spawn')

const configTransform = join(__dirname, 'mods', 'svelte-config.js')
const jscodeshiftExecutable = require.resolve('.bin/jscodeshift')

function codemod(transform: string, path: string) {
  spawn.sync(jscodeshiftExecutable, ['-t', transform, path], {
    stdio: 'inherit',
  })
}

/**
 * Adds all required dependencies and files to the user's app by copying them
 * over from src/default-app.
 */
export default async function init() {
  const builder = new DeploymentBuilder(process.cwd())
  builder.addDefaultAppResources(join(__dirname, 'default-app')).addDefaultEdgioScripts()
  codemod(configTransform, 'svelte.config.js')
}
