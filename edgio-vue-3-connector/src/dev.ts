/* istanbul ignore file */
import { createDevServer } from '@edgio/core/dev'

export default function () {
  return createDevServer({
    label: 'Vue 3',
    command: port =>
      process.env.PACKAGE_JSON_DEV
        ? `npm run dev -- --port ${port}`
        : `npx vite dev --port ${port}`,
    ready: [/localhost:/i],
  })
}
