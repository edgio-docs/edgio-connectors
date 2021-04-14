'use strict'

// This file was automatically added by layer0 deploy.
// You should commit this file to source control.

module.exports = {
  connector: '@layer0/spartacus',
  backends: {
    commerce: {
      domainOrIp: '<your-api-server>',
      hostHeader: '<your-api-server>',
    },
  },
}
