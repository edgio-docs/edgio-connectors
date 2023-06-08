/* istanbul ignore file */
import { createDevServer } from '@edgio/core/dev'

export default function () {
  return createDevServer({
    label: 'Sanity Studio',
    command: port => `npx sanity dev --port ${port} --host 127.0.0.1`,
    ready: [/127.0.0.1/i],
  })
}
