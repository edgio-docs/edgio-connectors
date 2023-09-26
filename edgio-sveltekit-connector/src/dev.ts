/* istanbul ignore file */
import createDevServer from '@edgio/core/dev/createDevServer'

export default async function dev() {
  return createDevServer({
    label: 'Sveltekit',
    ready: [/ready in/i],
    command: port => `npx vite dev --port ${port}`,
  })
}
