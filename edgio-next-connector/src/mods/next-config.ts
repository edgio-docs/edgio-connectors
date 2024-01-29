/* istanbul ignore file */
import { readFileSync } from 'fs-extra'
import type {
  API,
  AssignmentExpression,
  Collection,
  FileInfo,
  MemberExpression,
  Identifier,
} from 'jscodeshift'
import { join } from 'path'

const OLD_EXPORT_VAR_NAME = '_preEdgioExport'

module.exports = function transformNextConfig(fileInfo: FileInfo, api: API) {
  // Do not transform the next config file mulitple times
  if (fileInfo.source.indexOf('withEdgio') !== -1) {
    return fileInfo.source
  }

  const j = api.jscodeshift
  const root = j(fileInfo.source)

  const isMemberExpression = (node: any): node is MemberExpression => {
    return node.type === 'MemberExpression'
  }

  const isIdentifier = (node: any): node is Identifier => {
    return 'name' in node
  }

  const getDefaultExport = (root: Collection<any>) => {
    return root.find(j.AssignmentExpression, (node: AssignmentExpression) => {
      if (!isMemberExpression(node.left)) return false

      const leftProperty = node.left.property
      const leftObject = node.left.object

      if (isIdentifier(leftProperty) && isIdentifier(leftObject)) {
        return leftObject.name === 'module' && leftProperty.name === 'exports'
      }

      return false
    })
  }

  const defaultExport = getDefaultExport(root)
  // If we couldn't find the default export, we can't do anything
  if (defaultExport.length === 0) return fileInfo.source

  const isFunction = defaultExport.get().value.right.type.includes('FunctionExpression')

  const edgioNextConfigRoot = j(
    readFileSync(join(__dirname, '..', 'default-app', 'all', 'next.config.js')).toString()
  )
  const edgDefaultExport = getDefaultExport(edgioNextConfigRoot)

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

  const withEdgioExpr = edgioNextConfigRoot.find(j.CallExpression, expr => {
    return isIdentifier(expr.callee) && expr.callee.name === 'withEdgio'
  })
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
