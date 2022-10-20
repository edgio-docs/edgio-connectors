/* istanbul ignore file */
import createDevServer from '@edgio/core/dev/createDevServer'

export default async function dev() {
  return createDevServer({
    label: 'Razzle',
    command: () => 'npx razzle start',
    ready: [/> Started on port/i],
  })
}
