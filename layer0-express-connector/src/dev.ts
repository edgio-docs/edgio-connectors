import { createDevServer } from '@layer0/core/dev'
import { join } from 'path'
import { findDefaultAppPath } from './utils'

export default function dev() {
  return createDevServer({
    // All console output from your app will be prefixed with this label
    label: 'Express',
    // The command to start your app in dev mode
    run: port => {
      const config = require(join(process.cwd(), 'layer0.config.js'))
      const appPath = config.express?.appPath || findDefaultAppPath()
      if (appPath) {
        const app = require(appPath)
        app.listen(port, () => {
          console.log('Started Express server on port', port)
        })
      } else {
        console.log('Could not find an express app')
      }
    },
  })
}
