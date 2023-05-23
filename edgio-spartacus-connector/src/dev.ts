/* istanbul ignore file */
import createDevServer from '@edgio/core/dev/createDevServer'
import { getConfig } from '@edgio/core/config'

function validateCommerceBackend(): void {
  const edgioConfig = getConfig()
  const commerceOrigin = edgioConfig?.origins?.find(origin => origin.name === 'commerce')

  if (!commerceOrigin || commerceOrigin?.override_host_header === '<your-api-server>') {
    console.error('*** ERROR *** You must update edgio.config.js with your SAP Commerce endpoint.')
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
