/* istanbul ignore file */
import { createDevServer } from '@xdn/core/dev'

export default function() {
  return createDevServer({
    label: 'Frontity',
    command: port => `npx frontity dev --port=${port}`,
    ready: [/SERVER STARTED/i],
  })
}
