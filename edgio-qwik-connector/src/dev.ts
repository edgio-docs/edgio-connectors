/* istanbul ignore file */
import { createDevServer } from '@edgio/core/dev'

export default function () {
  return createDevServer({
    label: 'Qwik',
    command: port => `npx vite --mode ssr --port ${port}`,
    ready: [/Local/i],
  })
}
