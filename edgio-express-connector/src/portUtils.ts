import net from 'net'

/**
 * Attempts to find the nearest unbound port
 * @param port
 */
export async function getNearestUnboundPort(port: number): Promise<number | null> {
  if (port > 65535) {
    return null
  }
  const portBound = await isPortBound(port)
  return portBound ? getNearestUnboundPort(port + 1) : port
}

/**
 * Returns true if the port is in use
 * @param port
 * @param host
 */
export async function isPortBound(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let client: net.Socket

    if (port > 65535 || port <= 0) {
      reject(new Error('Invalid port'))
      return
    }

    if (!net.isIP(host)) {
      reject(new Error('Invalid host'))
      return
    }

    const clean = () => {
      if (client) {
        client.removeAllListeners('connect')
        client.removeAllListeners('error')
      }
    }

    const onConnect = () => {
      resolve(true)
      clean()
    }

    const onError = (error: { code: string }) => {
      if (error.code !== 'ECONNREFUSED') {
        reject(error)
        return
      }
      resolve(false)
      clean()
    }

    client = new net.Socket()
    client.once('connect', onConnect)
    client.once('error', onError)
    client.connect({ port: port, host: host }, () => {})
  })
}
