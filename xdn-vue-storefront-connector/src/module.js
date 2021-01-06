module.exports = function xdnVueStorefrontModule() {
  this.extendBuild(config => {
    config.resolve.alias['original-apollo-link-http'] =
      this.options.rootDir + '/node_modules/apollo-link-http'
    config.resolve.alias['apollo-link-http'] = this.options.srcDir + '/xdn/createHttpLink.js'
  })
}
