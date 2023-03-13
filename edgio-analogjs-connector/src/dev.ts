/* istanbul ignore file */
import { createDevServer } from '@edgio/core/dev'

export default function () {
  return createDevServer({
    label: 'Analog',
    command: port => `npm run start -- --port ${port}`,
    ready: [/localhost:/i],
  })
}
