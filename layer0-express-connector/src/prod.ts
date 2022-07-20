export default function prod(port: number) {
  return new Promise<void>((resolve, reject) => {
    try {
      process.env.PORT = port.toString()
      let app = require('./index')

      if (app.default) {
        app = app.default
      }

      if (app && app.listen) {
        app.listen(port, resolve)
      } else {
        resolve()
      }
    } catch (e) {
      reject(e)
    }
  })
}
