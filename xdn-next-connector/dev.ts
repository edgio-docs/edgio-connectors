/* istanbul ignore file */
import createDevServer from '@xdn/core/dev/createDevServer'

export default async function dev() {
  // @ts-ignore
  global.XDN_NEXT_APP = require('next')({ dev: true })

  return createDevServer({
    label: 'Next',
    command: port => `npx next dev -p ${port}`,
    filterOutput: (line: string) => {
      return !(
        line.match(/info {2}- ready on http:\/\/localhost:\d+\s*$/i) ||
        line.match(/ready - started server on http:\/\/localhost:\d+\s*$/)
      )
    },
    ready: [/ready on http:/i],
  })
}
