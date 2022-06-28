import { join } from 'path'

export default async function prod(port: number) {
  // @ts-ignore
  process.env.NITRO_PORT = port
  // @ts-ignore
  return __layer0DynamicImport__(join(process.cwd(), '.output', 'server', 'index.mjs'))
}
