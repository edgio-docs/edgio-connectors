/* istanbul ignore file */
import createDevServer from '@edgio/core/dev/createDevServer'

const getEdgioConfig = require('@edgio/cli/utils/getEdgioConfig')
const Logger = require('@edgio/cli/utils/Logger')

function validateCommerceBackend(): void {
  const edgioConfig = getEdgioConfig()
  const backend = edgioConfig?.backends?.commerce?.domainOrIp
  if (backend === '<your-api-server>') {
    const logger = new Logger()
    logger.error('*** ERROR *** You must update edgio.config.js with your SAP Commerce endpoint.')
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
