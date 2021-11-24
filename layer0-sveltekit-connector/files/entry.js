// adapted from https://github.com/sveltejs/kit/blob/master/packages/adapter-vercel/package.json
import { getRawBody } from '@sveltejs/kit/node'

// TODO hardcoding the relative location makes this brittle
import { init, render } from '../.svelte-kit/output/server/app.js'

init()

export default async (req, res) => {
  const { pathname, searchParams } = new URL(req.url || '', 'http://localhost')

  const rendered = await render({
    method: req.method,
    headers: req.headers,
    path: pathname,
    query: searchParams,
    rawBody: await getRawBody(req),
  })

  if (rendered) {
    const { status, headers, body } = rendered
    return res.writeHead(status, headers).end(body)
  }

  return res.writeHead(404).end()
}
