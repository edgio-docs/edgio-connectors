/* istanbul ignore file */
import { join } from 'path'
import qs from 'qs'
import { createServer } from 'http'
import nonWebpackRequire from '@xdn/core/utils/nonWebpackRequire'
import getDistDir from './util/getDistDir'

// Used in fetchFromAPI so that SSR pages don't call back into the lambda
// which would result in Moovweb being double-billed for each SSR request
process.env.API_HOST = `127.0.0.1:3001`

export default async function prod(port: number) {
  const distDir = getDistDir()

  const server = createServer(async (req, res) => {
    const page = req.headers['x-next-page'] // sent by createNextRenderer
    const search = req.url?.split('?')[1]

    // @ts-ignore
    req.query = qs.parse(search)

    try {
      const pagePath = join(process.cwd(), distDir, 'serverless', 'pages', <string>page)
      const mod = nonWebpackRequire(pagePath)

      if (mod.getServerSideProps || mod.getStaticProps) {
        // Is a React component
        await mod.renderReqToHTML(
          req,
          res,
          undefined,
          undefined,
          /* pass params to context object supplied to getStaticProps, getServerSideProps */
          // @ts-ignore
          req.query
        )
      } else if (mod.render) {
        // getInitialProps
        await mod.render(req, res)
      } else {
        // API functions
        await mod.default(req, res)
      }
    } catch (e) {
      const message = `An unexpected error occurred while processing the request with next.js. (page="${page}")`
      console.error(e.stack)
      res.writeHead(500)
      res.end(message)
    }
  })

  return new Promise<void>((resolve, reject) => {
    try {
      server.listen(port, resolve)
    } catch (e) {
      reject(e)
    }
  })
}
