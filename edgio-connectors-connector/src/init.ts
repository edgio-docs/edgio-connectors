import { join } from 'path'
import { DeploymentBuilder } from '@edgio/core/deploy'
import ConnectorFactory from './utils/ConnectorFactory'

/**
 * Adds all required dependencies and files to the user's app by copying them
 * over from src/default-app.
 */
module.exports = function init(name?: string) {
  // Name needs to be passed as its not yet parsable from edgio config / it doesn't exist yet.
  const connector = ConnectorFactory.get(name)

  const builder = new DeploymentBuilder(process.cwd())
  builder
    .addDefaultAppResources(
      join(__dirname, 'default-apps/base'),
      // We need to replace name of the connector thats gonna be used -> therefore we use
      // replace function (in order to not worry about naming of files, and dont read/write twice).
      (content: string) =>
        content
          .replace('${CONNECTOR_NAME}', connector.name)
          // To allow for custom edgio config section
          .replace('// ${CONNECTOR_FRAMEWORK_CONFIG}', connector.templateConfig ?? '')
          // To allow for custom routes section
          .replace('// ${CONNECTOR_INIT_ROUTES}', connector.templateRoutes ?? '')
    )
    .addDefaultEdgioScripts()

  if (connector.withServiceWorker) {
    // We only copy service worker if relevant to the connector / framework.
    builder.addDefaultAppResources(join(__dirname, 'default-apps/service-worker'))
  }

  connector.initCommand?.()
}
