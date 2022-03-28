'use strict'

// This file was automatically added by layer0 deploy.
// You should commit this file to source control.
// Change the api endpoint to the correct location in use

module.exports = {
  connector: '@layer0/vue-storefront',
  backends: {
    api: {
      domainOrIp: 'api.your-backend.com',
      hostHeader: 'api.your-backend.com',
    },
  },
  includeNodeModules: true,
}
