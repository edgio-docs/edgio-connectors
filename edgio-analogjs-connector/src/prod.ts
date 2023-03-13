import { join } from 'path'
import { existsSync } from 'fs'

export default async function prod(port: number) {
  const appFilePath = join(process.cwd(), 'server', 'index.mjs')
  // If server/index.mjs exist, run it
  if (existsSync(appFilePath)) {
    process.env.PORT = port.toString()
    // @ts-ignore
    return __edgioDynamicImport__(appFilePath)
  }
}
