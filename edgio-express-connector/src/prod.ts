export default function prod(port: number) {
  let getNearestUnboundPort: (port: number, host?: string) => Promise<number>

  try {
    getNearestUnboundPort = require('@edgio/express/portUtils').getNearestUnboundPort
  } catch (e) {
    console.warn(
      "Warning: Couldn't import @edgio/express/portUtils. The used port can't be checked."
    )
    getNearestUnboundPort = async (port: number, _) => port
  }

  return new Promise<void>((resolve, reject) => {
    try {
      process.env.PORT = port.toString()
      let app = require('./index')

      if (app.default) {
        app = app.default
      }

      if (app && app.listen) {
        getNearestUnboundPort(port).then((port: number | null) => {
          if (port === null) {
            console.error(`Error: Couldn't find any unsed port`)
            reject()
          }
          app.listen(port, resolve)
        })
      } else {
        resolve()
      }
    } catch (e) {
      reject(e)
    }
  })
}
