/* istanbul ignore file */
const { join } = require('path')
const { DeploymentBuilder } = require('@xdn/core/deploy')

/**
 * Adds all required dependencies and files to the user's app by copying them
 * over from src/default-app.
 */
export default function init() {
  new DeploymentBuilder(process.cwd())
    .addDefaultAppResources(join(__dirname, 'default-app'))
    .addDefaultXdnScripts()
}
