import { existsSync } from 'fs'
import { resolve } from 'path'

module.exports = async (port: number) => {
  const serverFilePath = resolve('server', 'entry.express.js')
  if (existsSync(serverFilePath)) {
    try {
      process.env.PORT = port.toString()
      // @ts-ignore
      return import(/* webpackIgnore: true */ serverFilePath)
    } catch (e) {
      console.log(e)
    }
  }
}
