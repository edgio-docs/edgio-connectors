import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

module.exports = async (port: number) => {
  const appFilePath = join(process.cwd(), 'appPath.json')
  if (!existsSync(appFilePath)) {
    console.warn(
      `You've output: 'server' set in astro.config.mjs. You need to set astro.appPath inside edgio.config.js to run Astro SSR with Edgio.`
    )
    return
  }
  try {
    // @ts-ignore
    let appPath = JSON.parse(readFileSync(appFilePath, 'utf8')).appPath
    process.env.PORT = port.toString()
    // @ts-ignore
    await __edgioDynamicImport__(join(process.cwd(), appPath))
  } catch (e) {
    console.log(e)
  }
}
