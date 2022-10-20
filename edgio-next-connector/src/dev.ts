/* istanbul ignore file */
import createDevServer from '@edgio/core/dev/createDevServer'

export default async function dev() {
  // @ts-ignore
  global.EDGIO_NEXT_APP = require('next')({ dev: true })

  return createDevServer({
    label: 'Next',
    command: port => `npx next dev -p ${port}`,
    ready: [/(started server on|ready on)/i],
  })
}
