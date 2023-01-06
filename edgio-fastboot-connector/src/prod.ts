import path from 'path'
import express from 'express'
import { existsSync } from 'fs'

const FastBoot = require('fastboot')
const fastbootMiddleware = require('fastboot-express-middleware')

export default function (port: number) {
  const distPath = path.join(process.cwd(), 'dist')
  if (existsSync(distPath)) {
    return new Promise<void>((resolve, reject) => {
      const app = express()
      app.use(
        fastbootMiddleware({
          fastboot: new FastBoot({ distPath }),
        })
      )
      app.listen(port, () => {
        resolve()
      })
    })
  }
}
