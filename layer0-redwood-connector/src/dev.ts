/* istanbul ignore file */
import { createDevServer } from '@layer0/core/dev'

export default function dev() {
  return createDevServer({
    label: 'Redwood',
    command: port => `yarn rw dev --fwd="--port=${port}"`,
    ready: [/listening on/i],
  })
}
