import { existsSync } from 'fs'
import { getConfig } from '@edgio/core/config'
import { join } from 'path'

export default async function prod(port: number) {
  const edgioConfig = getConfig()
  // combine dirname with entryFile, but go one folder backwards
  // as prod module is loaded from _backends_ folder, which is one
  // level up relative to lambda folder that is used by edgio deployer
  const fullPath = join(__dirname, '..', edgioConfig.customConnector?.entryFile!)

  if (edgioConfig.customConnector?.entryFile && existsSync(fullPath)) {
    process.env[edgioConfig.customConnector!.envPort!] = port.toString()
    process.env.PORT = port.toString()
    // Do not remove webpackIgnore comment in import statement below.
    // it is used to tell webpack to ignore this import and not
    // change it with it's internal logic.
    const server = await import(/* webpackIgnore: true */ fullPath)
    return server
  }
}
