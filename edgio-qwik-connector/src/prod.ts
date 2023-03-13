import { existsSync } from 'fs'
import { resolve } from 'path'

module.exports = async (port: number) => {
  const serverFilePath = resolve(process.cwd(), 'server', 'entry.express.js')
  if (existsSync(serverFilePath)) {
    try {
      process.env.PORT = port.toString()
      // @ts-ignore
      await __edgioDynamicImport__(serverFilePath)
    } catch (e) {
      console.log(e)
    }
  }
}
