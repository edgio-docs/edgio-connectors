/* istanbul ignore file */
import { createDevServer } from '@layer0/core/dev'
import getHydrogenCommand from './utils/getHydrogenCommand'

export default function dev() {
  return createDevServer({
    label: 'Shopify Hydrogen',
    // port cannot be set for hydrogen dev server (currently defaults to 3000)
    // so we force binding to all addresses which bumps it to the next available
    // port (3001)
    command: () => getHydrogenCommand('dev', '--host'),
    ready: [/Network/i],
  })
}
