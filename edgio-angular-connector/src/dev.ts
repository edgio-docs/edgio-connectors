/* istanbul ignore file */
import createDevServer from '@edgio/core/dev/createDevServer'

export default async function dev() {
  return createDevServer({
    label: 'Angular',
    command: port => `npx ng serve --port ${port}`,
    ready: [/compiled successfully/i],
  })
}
