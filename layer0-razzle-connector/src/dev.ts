/* istanbul ignore file */
import createDevServer from '@layer0/core/dev/createDevServer'

export default async function dev() {
  return createDevServer({
    label: 'Razzle',
    command: () => 'npx razzle start',
    ready: [/> Started on port/i],
  })
}
