import { join } from 'path'

export default async function prod(port: number) {
  // @ts-ignore
  const { createServer } = await esImport(join(process.cwd(), 'dist', 'node', 'index.js'))
  const { app } = await createServer()
  app.listen(port)
}
