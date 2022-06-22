import nonWebpackRequire from '@layer0/core/utils/nonWebpackRequire'
import { join } from 'path'

export default async function prod(port: number) {
  return new Promise<void>((resolve, reject) => {
    try {
      // @ts-ignore
      process.env.NUXT_PORT = port
      nonWebpackRequire(join(process.cwd(), '.output', 'server'))
      setTimeout(resolve, 100)
    } catch (e) {
      reject(e)
    }
  })
}
