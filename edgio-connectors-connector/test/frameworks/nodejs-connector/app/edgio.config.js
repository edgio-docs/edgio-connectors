/**
 * Needed for unit tests
 */
module.exports = {
  // this is a comment
  name: 'nodejs-connector',
  connector: '@edgio/nodejs-connector',

  nodejsConnector: {
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
