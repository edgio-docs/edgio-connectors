import path from 'path'
import express from 'express'

const FastBoot = require('fastboot')
const fastbootMiddleware = require('fastboot-express-middleware')

export default function(port: number) {
  return new Promise<void>((resolve, reject) => {
    const app = express()

    app.use(
      fastbootMiddleware({
        fastboot: new FastBoot({
          distPath: path.join(process.cwd(), 'dist'),
        }),
      })
    )

    app.listen(port, () => {
      resolve()
    })
  })
}
