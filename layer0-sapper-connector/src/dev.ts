/* istanbul ignore file */
import createDevServer from '@layer0/core/dev/createDevServer'

export default async function dev() {
  return createDevServer({
    label: 'Sapper',
    command: () => 'npx sapper dev',
    ready: [/listening on/i],
  })
}
