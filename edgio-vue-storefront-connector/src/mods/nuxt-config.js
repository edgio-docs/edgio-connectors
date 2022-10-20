const j = require('jscodeshift')

const webpackReplacement = `
let webpack
try {
  webpack = require('webpack')
}catch(e){
  // Webpack is not necessary in production build and its actions are not needed
}`

/*

This module is the "codemod" which describes
what changes need to be made to the nuxt config file.

It will be ran on `init` using the jscodeshift toolkit.

The codemod itself describes transforms to be made to the AST.
This is a much cleaner approach that just string replacements.

Read more about the toolkit [here](https://github.com/facebook/jscodeshift)

*/

module.exports = function transformNuxtConfig(fileInfo, api) {
  const root = api.jscodeshift(fileInfo.source)

  // We are replacing the importing of webpack here because
  // when the application is ran in serverless mode, it does not
  // have or need the webpack dependency.
  const webpackImport = root.find(j.ImportDeclaration, node => node.source.value === 'webpack')
  webpackImport.replaceWith(webpackReplacement)

  // Next, we are moving all modules to buildModules to make the serverless
  // application bundle smaller.
  // const modulesConfig = root.find(j.Property, node => node.key.name === 'modules')
  const buildModulesConfig = root.find(j.Property, node => node.key.name === 'buildModules')

  // Find all modules
  // const modules = modulesConfig.get().value.value.elements.map(e => e.value)

  // Build modules
  const buildModulesArray = buildModulesConfig.find(j.ArrayExpression).get()

  // Remove all modules
  // modulesConfig.find(j.ArrayExpression).replaceWith('[]')

  // // Move them to buildModules
  // modules.forEach(name => {
  //   buildModulesArray.get('elements').push(j.literal(name))
  // })

  // Add custom Edgio build extensions
  const customEdgioBuildModules = ['@edgio/nuxt/module', '@edgio/vue-storefront/module']
  const buildModules = buildModulesConfig.get().value.value.elements.map(e => e.value)

  customEdgioBuildModules.forEach(name => {
    if (buildModules.indexOf(name) === -1) {
      buildModulesArray.get('elements').push(j.literal(name))
    }
  })

  // Add check for webpack before using plugin
  const buildConfig = root.find(j.Property, node => node.key.name === 'build')

  // It was always finding plugins under babel ? Not sure how to limit search to be shallow only
  const pluginsConfig = buildConfig.find(
    j.Property,
    node => node.key.name === 'plugins' && node.value.elements[0].type === 'NewExpression'
  )
  if (pluginsConfig.length > 0) {
    const pluginsArray = pluginsConfig.get().value.value

    if (pluginsArray && pluginsArray.type === 'ArrayExpression') {
      pluginsConfig
        .find(j.ArrayExpression)
        .replaceWith(`[webpack && ${j(pluginsArray.elements[0]).toSource()}]`)
    }
  }

  // Add check for webpack before building styles
  const cssConfig = root.find(j.Property, node => node.key.name === 'css')
  if (cssConfig.length > 1) {
    const cssObject = cssConfig.get().value.value
    if (cssObject.type === 'ArrayExpression') {
      cssConfig.find(j.ArrayExpression).replaceWith('webpack && ' + j(cssObject).toSource())
    }
  }
  const styleResourcesConfig = root.find(j.Property, node => node.key.name === 'styleResources')
  const styleResourcesObject = styleResourcesConfig.get().value.value
  if (styleResourcesObject.type === 'ObjectExpression') {
    styleResourcesConfig
      .find(j.ObjectExpression)
      .replaceWith('webpack && ' + j(styleResourcesObject).toSource())
  }

  return root.toSource()
}
