import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

export default async function (port: number) {
  const appFilePath = join(process.cwd(), 'appPath.json')
  // If appPath inside edgio.config.js doesn't exist, then appPath.json will not be created.
  if (!existsSync(appFilePath)) {
    const astroConfigPath = join(process.cwd(), 'astro.config.json')
    let astroConfig = JSON.parse(readFileSync(astroConfigPath, 'utf8'))
    // Check if the output is set to server inside Astro
    // If yes, alert the user to use astro.appPath inside edgio.config.js
    if (astroConfig.output === 'server') {
      console.warn(
        `You've output: 'server' set in astro.config.mjs. You need to set astro.appPath inside edgio.config.js to run Astro SSR with Edgio.`
      )
    }
    return
  }
  try {
    // @ts-ignore
    let appPath = JSON.parse(readFileSync(appFilePath, 'utf8')).appPath
    process.env.PORT = port.toString()
    // @ts-ignore
    await import(/* webpackIgnore: true */ join(process.cwd(), appPath))
  } catch (e) {
    console.log(e)
  }
}
