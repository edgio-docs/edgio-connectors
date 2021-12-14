/* istanbul ignore file */
import { createDevServer } from '@layer0/core/dev'

export default function () {
  return createDevServer({
    label: 'Astro',
    command: port => `npx astro dev --port=${port}`,
    ready: [/http:\/\/localhost:\d+\//i],
  })
}
