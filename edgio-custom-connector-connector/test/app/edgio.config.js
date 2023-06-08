/**
 * Needed for unit tests
 */
module.exports = {
  // this is a comment
  name: 'custom-connector',
  connector: '@edgio/custom-connector',

  customConnector: {
    buildFolder: 'build',
    entryFile: 'index.js',
    staticFolder: 'static',
    envPort: 'PORT',
    buildCommand: 'nuxt build',
    devCommand: 'nuxt dev',
    devReadyMessage: '> Local:',
  },

  backends: {
    origin: {
      domainOrIp: 'jest.edg.io',
    },
  },
}
