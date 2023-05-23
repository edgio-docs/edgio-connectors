/* istanbul ignore file */
import { createDevServer } from '@edgio/core/dev'

export default function () {
  return createDevServer({
    label: 'AnalogJS',
    command: port => `npx ng serve --port=${port}`,
  })
}
