import { readFileSync } from 'fs-extra'
import { API, FileInfo } from 'jscodeshift'
import { join } from 'path'

const OLD_EXPORT_VAR_NAME = '_preLayer0Export'

module.exports = function transformNextConfig(fileInfo: FileInfo, api: API) {
  // Do not transform the next config file mulitple times
  if (fileInfo.source.indexOf('withLayer0') !== -1) {
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

  const layer0NextConfigRoot = j(
    readFileSync(join(__dirname, '..', 'default-app', 'all', 'next.config.js')).toString()
  )
  const l0DefaultExport = layer0NextConfigRoot.find(
    j.AssignmentExpression,
    node => node.left?.object?.name === 'module' && node.left?.property?.name === 'exports'
  )

  const withServiceWorkerExpr = layer0NextConfigRoot.find(
    j.CallExpression,
    expr => expr.callee.name === 'withServiceWorker'
  )
  const withServiceWorkerArg = withServiceWorkerExpr.find(j.ObjectExpression)

  const existingExportVar = j.identifier(OLD_EXPORT_VAR_NAME)
  defaultExport.replaceWith(
    j.variableDeclaration('const', [
      j.variableDeclarator(existingExportVar, defaultExport.get().value.right),
    ])
  )
  const existingResultExpr = isFunction
    ? j.callExpression(existingExportVar, l0DefaultExport.get().value.right.params)
    : existingExportVar
  const existingResult = j.spreadElement(existingResultExpr)
  withServiceWorkerArg.get().value.properties.push(existingResult)

  const newExportDefault = j.assignmentExpression(
    '=',
    j.memberExpression(j.identifier('module'), j.identifier('exports')),
    l0DefaultExport.get().value.right
  )

  // add the imports from the top of the L0 config file:
  const rootBody = root.get('program').get('body').value
  layer0NextConfigRoot
    .get('program')
    .get('body')
    .value.forEach((node: any) => {
      if (node.expression !== l0DefaultExport.get().value) {
        rootBody.unshift(node)
      }
    })
  rootBody.push(j(newExportDefault).toSource())

  return root.toSource()
}
