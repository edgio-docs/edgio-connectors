import { join } from 'path'
import { readFileSync } from 'fs'

module.exports = async (port: number) => {
  const appDir = process.cwd()
  const { appPath = null, output = 'static' } = JSON.parse(
    readFileSync(join(appDir, 'astro.config.json'), 'utf8')
  )
  if (appPath) {
    try {
      process.env.PORT = port.toString()
      // @ts-ignore
      await __edgioDynamicImport__(join(appDir, appPath))
    } catch (e) {
      console.log(e)
    }
  } else {
    // Check if the output is set to server inside Astro
    // If yes, alert the user to use astro.appPath inside edgio.config.js
    if (output === 'server') {
      console.warn(
        `You've output: 'server' set in astro.config.mjs. You need to set astro.appPath inside edgio.config.js to run Astro SSR with Edgio.`
      )
    }
    return
  }
}
