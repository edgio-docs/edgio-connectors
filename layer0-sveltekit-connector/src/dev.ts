/* istanbul ignore file */
import createDevServer from '@layer0/core/dev/createDevServer'

export default async function dev() {
  return createDevServer({
    label: 'Sveltekit',
    command: port => `npx svelte-kit dev -p ${port}`,
  })
}
