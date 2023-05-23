/* istanbul ignore file */

import { readFileSync } from 'fs-extra'
import { API, FileInfo } from 'jscodeshift'
import { join } from 'path'

const OLD_EXPORT_VAR_NAME = '_preEdgioExport'

module.exports = function transformNextConfig(fileInfo: FileInfo, api: API) {
  // Do not transform the next config file mulitple times
  if (fileInfo.source.indexOf('withEdgio') !== -1) {
    return fileInfo.source
  }

  const j = api.jscodeshift
  const root = j(fileInfo.source)

  // TODO - do we need to handle "export default ..."? doesn't seem like it based
  // on docs https://nextjs.org/docs/api-reference/next.config.js/introduction
  const defaultExport = root.find(
    j.AssignmentExpression,
    node => node.left?.object?.name === 'module' && node.left?.property?.name === 'exports'
  )
  const isFunction = defaultExport.get().value.right.type.includes('FunctionExpression')

  const edgioNextConfigRoot = j(
    readFileSync(join(__dirname, '..', 'default-app', 'all', 'next.config.js')).toString()
  )
  const edgDefaultExport = edgioNextConfigRoot.find(
    j.AssignmentExpression,
    node => node.left?.object?.name === 'module' && node.left?.property?.name === 'exports'
  )

  const existingExportVar = j.identifier(OLD_EXPORT_VAR_NAME)
  defaultExport.replaceWith(
    j.variableDeclaration('const', [
      j.variableDeclarator(existingExportVar, defaultExport.get().value.right),
    ])
  )
  const existingResultExpr = isFunction
    ? j.callExpression(existingExportVar, edgDefaultExport.get().value.right.params)
    : existingExportVar
  const existingResult = j.spreadElement(existingResultExpr)

  const withEdgioExpr = edgioNextConfigRoot.find(
    j.CallExpression,
    expr => expr.callee.name === 'withEdgio'
  )
  const withEdgioArg = withEdgioExpr.find(j.ObjectExpression)
  withEdgioArg.get().value.properties.push(existingResult)

  const newExportDefault = j.assignmentExpression(
    '=',
    j.memberExpression(j.identifier('module'), j.identifier('exports')),
    edgDefaultExport.get().value.right
  )

  // add the imports from the top of the L0 config file:
  const rootBody = root.get('program').get('body').value
  edgioNextConfigRoot
    .get('program')
    .get('body')
    .value.forEach((node: any) => {
      if (node.expression !== edgDefaultExport.get().value) {
        rootBody.unshift(node)
      }
    })
  rootBody.push(j(newExportDefault).toSource())

  return root.toSource()
}
