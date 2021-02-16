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
        line.match(/ready on http:\/\/localhost:\d+\s*$/i /* Next 9 */) ||
        line.match(/started server on 0\.0\.0\.0:\d+/ /* Next 10+ */)
      )
    },
    ready: [/ready on http:/i],
  })
}
