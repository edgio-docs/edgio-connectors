/**
 * Needed for unit tests
 */
module.exports = {
  // this is a comment
  name: 'custom-connector',
  connector: '@edgio/custom-connector',

  customConnector: {
    staticFolder: 'build',
    entryFile: 'index.js',
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
