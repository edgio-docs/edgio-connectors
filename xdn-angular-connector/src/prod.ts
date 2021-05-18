/* istanbul ignore file */
export default async function prod(port: number) {
  return new Promise((resolve, reject) => {
    try {
      require('./angular-server')
        .app()
        .listen(port, resolve)
    } catch (e) {
      reject(e)
    }
  })
}
