import { join } from 'path'
import esImport from '@edgio/core/utils/esImport'

export default async function prod(port: number) {
  // @ts-ignore
  const { createServer } = await esImport(join(process.cwd(), 'dist', 'node', 'index.js'))

  // @ts-ignore
  return createServer().then(({ app }) => app.listen(port))
}
