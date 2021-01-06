'use strict'

// This file was automatically added by xdn deploy.
// You should commit this file to source control.

module.exports = {
  connector: '@xdn/spartacus',
  backends: {
    commerce: {
      domainOrIp: '<your-api-server>',
      hostHeader: '<your-api-server>',
    },
  },
}
