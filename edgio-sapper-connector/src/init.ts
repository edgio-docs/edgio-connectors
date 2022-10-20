/* istanbul ignore file */
const { join } = require('path')
const { DeploymentBuilder } = require('@edgio/core/deploy')

/**
 * Adds all required dependencies and files to the user's app by copying them
 * over from src/default-app.
 */
export default async function init() {
  const builder = new DeploymentBuilder(process.cwd())
  builder.addDefaultAppResources(join(__dirname, 'default-app')).addDefaultEdgioScripts()
}
