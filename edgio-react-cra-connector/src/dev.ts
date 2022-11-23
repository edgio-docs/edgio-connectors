/* istanbul ignore file */
import { createDevServer } from '@edgio/core/dev'

export default function () {
  // Detecting OS per Node.js 14
  // https://nodejs.org/dist/latest-v14.x/docs/api/process.html#:~:text=pid%7D%60)%3B-,process.platform,-%2
  // Currently solved at https://stackoverflow.com/questions/8683895/how-do-i-determine-the-current-operating-system-with-node-js
  const isWin = process.platform === 'win32'
  return createDevServer({
    label: 'React CRA',
    command: port =>
      isWin
        ? `set PORT=${port} && set BROWSER=none && npx react-scripts start`
        : `PORT=${port} BROWSER=none npx react-scripts start`,
    ready: [/localhost:/i],
  })
}
