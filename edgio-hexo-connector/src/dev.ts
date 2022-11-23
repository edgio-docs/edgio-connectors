/* istanbul ignore file */
import { createDevServer } from '@edgio/core/dev'

export default function () {
  return createDevServer({
    label: 'Hexo',
    command: port => `npx hexo server --port ${port}`,
    ready: [/localhost:/i],
  })
}
