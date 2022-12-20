/* istanbul ignore file */
import { createDevServer } from '@edgio/core/dev'

export default function () {
  return createDevServer({
    label: 'FastBoot',
    command: port => `npx ember serve --port=${port}`,
    ready: [/Serving on http/i],
  })
}