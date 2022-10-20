/* istanbul ignore file */
import createDevServer from '@edgio/core/dev/createDevServer'

export default async function dev() {
  return createDevServer({
    label: 'Sveltekit',
    ready: [/localhost:\d+/],
    command: port => `npx svelte-kit dev --port ${port}`,
  })
}
