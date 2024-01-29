import { join } from 'path'
import ConnectorBuilder from '../../utils/ConnectorBuilder'
import { isProductionBuild } from '@edgio/core/environment'

export default new ConnectorBuilder('react-cra')
  .setBuild({
    command: 'npx react-scripts build',
  })
  .setDev(() => {
    const isWin = process.platform === 'win32'
    return {
      command: port =>
        isWin
          ? `set PORT=${port} && set BROWSER=none && npx react-scripts start`
          : `PORT=${port} BROWSER=none npx react-scripts start`,
      ready: [/localhost:/i],
    }
  })
  .setOnRegister(router => {
    if (isProductionBuild()) {
      router.match('/:path*', ({ serveStatic }) => {
        serveStatic(join('build', 'index.html'))
      })
      router.static('build', { ignore: 'service-worker.js' })
    } else {
      router.match('/:path*', ({ renderWithApp }) => {
        renderWithApp()
      })
    }
  })
  .withServiceWorker()
  .toConnector()
