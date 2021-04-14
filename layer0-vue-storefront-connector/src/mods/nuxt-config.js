const j = require('jscodeshift')

const webpackReplacement = `
let webpack
try {
  webpack = require('webpack')
}catch(e){
  // We are in a non-build env.
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
  const modulesConfig = root.find(j.Property, node => node.key.name === 'modules')
  const buildModulesConfig = root.find(j.Property, node => node.key.name === 'buildModules')

  // Find all modules
  const modules = modulesConfig.get().value.value.elements.map(e => e.value)

  // Remove all modules
  modulesConfig.find(j.ArrayExpression).replaceWith('[]')

  // Move them to buildModules
  const buildModulesArray = buildModulesConfig.find(j.ArrayExpression).get()
  modules.forEach(name => {
    buildModulesArray.get('elements').push(j.literal(name))
  })

  // Add custom Layer0 build extensions
  const customLayer0BuildModules = ['@layer0/nuxt/module', '@layer0/vue-storefront/module']
  const buildModules = buildModulesConfig.get().value.value.elements.map(e => e.value)

  customLayer0BuildModules.forEach(name => {
    if (buildModules.indexOf(name) === -1) {
      buildModulesArray.get('elements').push(j.literal(name))
    }
  })

  // Add check for webpack before using plugin
  const buildConfig = root.find(j.Property, node => node.key.name === 'build')
  const buildObject = buildConfig.get().value.value
  if (buildObject.type === 'ObjectExpression') {
    buildConfig.find(j.ObjectExpression).replaceWith('webpack && ' + j(buildObject).toSource())
  }

  // Add check for webpack before building styles
  const cssConfig = root.find(j.Property, node => node.key.name === 'css')
  const cssObject = cssConfig.get().value.value
  if (cssObject.type === 'ArrayExpression') {
    cssConfig.find(j.ArrayExpression).replaceWith('webpack && ' + j(cssObject).toSource())
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
