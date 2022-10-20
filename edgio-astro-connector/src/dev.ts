/* istanbul ignore file */
import { createDevServer } from '@edgio/core/dev'

export default function () {
  return createDevServer({
    label: 'Astro',
    command: port => `npx astro dev --port ${port}`,
    ready: [/localhost:/i],
  })
}
