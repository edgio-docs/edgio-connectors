import { createDevServer } from '@layer0/core/dev'
import { join } from 'path'

export default function dev() {
  const packageJson = require(join(process.cwd(), 'package.json'))
  const startScript = packageJson.scripts?.dev || packageJson.scripts?.start

  return createDevServer({
    // All console output from your app will be prefixed with this label
    label: 'Express',

    // The command to start your app in dev mode
    command: () => startScript,
  })
}
