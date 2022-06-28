/* istanbul ignore file */
import { createDevServer } from '@layer0/core/dev'

export default function () {
  return createDevServer({
    label: 'Frontity',
    command: port => `npx frontity dev --port=${port}`,
    ready: [/SERVER STARTED/i],
  })
}
