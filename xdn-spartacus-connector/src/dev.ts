/* istanbul ignore file */
import createDevServer from '@xdn/core/dev/createDevServer'

const getXdnConfig = require('@xdn/cli/utils/getXdnConfig')
const Logger = require('@xdn/cli/utils/Logger')

function validateCommerceBackend(): void {
  const xdnConfig = getXdnConfig()
  const backend = xdnConfig?.backends?.commerce?.domainOrIp
  if (backend === '<your-api-server>') {
    const logger = new Logger()
    logger.error('*** ERROR *** You must update xdn.config.js with your SAP Commerce endpoint.')
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
