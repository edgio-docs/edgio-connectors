/* istanbul ignore file */
import { createDevServer } from '@edgio/core/dev'

export default function () {
  // Detecting OS per Node.js 14
  // https://nodejs.org/dist/latest-v14.x/docs/api/process.html#:~:text=pid%7D%60)%3B-,process.platform,-%2
  // Currently solved at https://stackoverflow.com/questions/8683895/how-do-i-determine-the-current-operating-system-with-node-js
  const isWin = process.platform === 'win32'
  return createDevServer({
    label: 'Nitropack',
    command: port =>
      isWin ? `set PORT=${port} && npx nitropack dev` : `PORT=${port} npx nitropack dev`,
    ready: [/localhost:/i],
  })
}
