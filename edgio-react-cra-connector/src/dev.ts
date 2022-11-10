/* istanbul ignore file */
import { createDevServer } from '@edgio/core/dev'

export default function () {
  const isWin = require('os').platform().indexOf('win') > -1
  return createDevServer({
    label: 'React CRA',
    command: port =>
      isWin
        ? `set PORT=${port} && set BROWSER=none && npx react-scripts start`
        : `PORT=${port} BROWSER=none npx react-scripts start`,
    ready: [/localhost:/i],
  })
}
