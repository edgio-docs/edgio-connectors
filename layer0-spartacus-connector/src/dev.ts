/* istanbul ignore file */
import createDevServer from '@layer0/core/dev/createDevServer'

const getLayer0Config = require('@layer0/cli/utils/getLayer0Config')
const Logger = require('@layer0/cli/utils/Logger')

function validateCommerceBackend(): void {
  const layer0Config = getLayer0Config()
  const backend = layer0Config?.backends?.commerce?.domainOrIp
  if (backend === '<your-api-server>') {
    const logger = new Logger()
    logger.error('*** ERROR *** You must update layer0.config.js with your SAP Commerce endpoint.')
    process.exit(1)
  }
}

export default async function dev() {
  validateCommerceBackend()

  return createDevServer({
    label: 'Spartacus',
    command: () => 'npm run dev:ssr',
    ready: [/compiled successfully/i],
    filterOutput: line => {
      return line.match(/\w/) && !line.match(/listening on/i) ? true : false
    },
  })
}
