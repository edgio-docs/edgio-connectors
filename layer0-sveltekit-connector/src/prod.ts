/* istanbul ignore file */
import { URL } from 'url'
import { createServer } from 'http'

// @ts-ignore
import { get_body } from '@sveltejs/app-utils/http'

export default function prod(port: number) {
  return new Promise<void>(resolve => {
    createServer(async (req, res) => {
      const { pathname, searchParams } = new URL(req.url || '', 'http://localhost')

      // @ts-ignore
      const app = await __non_webpack_import__('./app.mjs') // await import('./app.mjs')

      const rendered = await app.render({
        method: req.method,
        headers: req.headers,
        path: pathname,
        query: searchParams,
        body: await get_body(req),
      })

      if (rendered) {
        const { status, headers, body } = rendered
        return res.writeHead(status, headers).end(body)
      }

      return res.writeHead(404).end()
    }).listen(port, resolve)
  })
}
