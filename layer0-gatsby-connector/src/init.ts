import { join } from 'path'
import { DeploymentBuilder } from '@layer0/core/deploy'

/**
 * Adds all required dependencies and files to the user's app by copying them
 * over from src/default-app.
 */
export default function init() {
  new DeploymentBuilder(process.cwd())
    .addDefaultAppResources(join(__dirname, 'default-app'))
    .addDefaultLayer0Scripts({
      'layer0:deploy': 'gatsby clean && layer0 deploy',
    })
}
