/* istanbul ignore file */
import createDevServer from '@layer0/core/dev/createDevServer'

export default async function dev() {
  // @ts-ignore
  global.LAYER0_NEXT_APP = require('next')({ dev: true })

  return createDevServer({
    label: 'Next',
    command: port => `npx next dev -p ${port}`,
    ready: [/(started server on|ready on)/i],
  })
}
