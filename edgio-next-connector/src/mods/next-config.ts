/* istanbul ignore file */
import { readFileSync } from 'fs-extra'
import type {
  API,
  AssignmentExpression,
  Collection,
  FileInfo,
  MemberExpression,
  Identifier,
  Node,
  CallExpression,
  ExportDefaultDeclaration,
} from 'jscodeshift'
import { join, basename } from 'path'

const OLD_EXPORT_VAR_NAME = '_preEdgioExport'

export default function transformNextConfig(fileInfo: FileInfo, api: API): string {
  // Do not transform the next config file multiple times
  if (fileInfo.source.includes('withEdgio')) return fileInfo.source

  const filename = basename(fileInfo.path)
  const fileExtension = filename.split('.').pop()

  // Do not transform files that are not known JS/TS files
  if (!fileExtension || !['js', 'ts', 'mjs'].includes(fileExtension)) {
    return fileInfo.source
  }

  const j = api.jscodeshift
  const root = j(fileInfo.source)

  const isMemberExpression = (node: Node): node is MemberExpression =>
    node.type === 'MemberExpression'
  const isIdentifier = (node: Node): node is Identifier => 'name' in node

  const getDefaultExport = (
    root: Collection<Node>
  ): Collection<AssignmentExpression> | Collection<ExportDefaultDeclaration> | null => {
    const commonJSExport = root.find(j.AssignmentExpression, (node: AssignmentExpression) => {
      if (!isMemberExpression(node.left)) return false
      const { property: leftProperty, object: leftObject } = node.left
      return (
        isIdentifier(leftProperty) &&
        isIdentifier(leftObject) &&
        leftObject.name === 'module' &&
        leftProperty.name === 'exports'
      )
    })

    if (commonJSExport.length > 0) return commonJSExport.at(0)

    const esmExport = root.find(j.ExportDefaultDeclaration)
    return esmExport.length > 0 ? esmExport.at(0) : null
  }

  const getExpressionValue = (
    node: Collection<AssignmentExpression> | Collection<ExportDefaultDeclaration>
  ) => {
    const value = node.get().value
    return value.type === 'AssignmentExpression' ? value.right : value.declaration
  }

  // If we couldn't find the default export, we can't do anything
  const defaultExport = getDefaultExport(root)
  if (!defaultExport) return fileInfo.source

  const defaultExportValue = getExpressionValue(defaultExport)
  if (!defaultExportValue) return fileInfo.source

  const isFunction = ['FunctionDeclaration', 'ArrowFunctionExpression'].includes(
    defaultExportValue.type
  )
  const edgioNextConfigRoot = j(
    readFileSync(
      join(__dirname, '..', 'default-app', fileExtension, `next.config.${fileExtension}`)
    ).toString()
  )

  // If we couldn't find the default export in the Edgio temaplate next.config file, just end
  const edgDefaultExport = getDefaultExport(edgioNextConfigRoot)
  if (!edgDefaultExport) return fileInfo.source

  // If we couldn't find the default export value in the Edgio template next.config file, just end
  const edgDefaultExportValue = getExpressionValue(edgDefaultExport)
  if (!edgDefaultExportValue) return fileInfo.source

  // Move existing user's default export under const _preEdgioExport = ...
  const existingExportVar = j.identifier(OLD_EXPORT_VAR_NAME)
  defaultExport.replaceWith(
    j.variableDeclaration('const', [j.variableDeclarator(existingExportVar, defaultExportValue)])
  )

  // Find existing user's default export and if it's a function, call it with the same params
  const existingResultExpr = isFunction
    ? j.callExpression(existingExportVar, (edgDefaultExportValue as any).params)
    : existingExportVar
  const existingResult = j.spreadElement(existingResultExpr)

  // Find withEdgio expression and add existing user's default export to it
  const withEdgioExpr = edgioNextConfigRoot.find(
    j.CallExpression,
    (expr: CallExpression) => isIdentifier(expr.callee) && expr.callee.name === 'withEdgio'
  )
  const withEdgioArg = withEdgioExpr.find(j.ObjectExpression)
  withEdgioArg.get().value.properties.push(existingResult)

  // Create new default export
  // For TS and MJS: export default ...
  // For JS: module.exports = ...
  const newExportDefault =
    fileExtension === 'js'
      ? j.expressionStatement(
          j.assignmentExpression(
            '=',
            j.memberExpression(j.identifier('module'), j.identifier('exports')),
            edgDefaultExportValue
          )
        )
      : j.exportDefaultDeclaration(edgDefaultExportValue)

  const rootBody = root.get('program').get('body').value
  edgioNextConfigRoot
    .get('program')
    .get('body')
    .value.forEach((node: any) => {
      // ESM/CommonJS Edgio default export
      const isEdgioExport =
        node.type === edgDefaultExport.get().value.type &&
        node.start === edgDefaultExport.get().value.start
      // Common JS default export
      const isModuleExports =
        node.type === 'ExpressionStatement' &&
        node.expression.type === 'AssignmentExpression' &&
        node.expression.left.type === 'MemberExpression' &&
        node.expression.left.object.name === 'module' &&
        node.expression.left.property.name === 'exports'

      // Do not add default commonjs export or edgio export to our source code template.
      // We'll add new default as last step.
      if (isModuleExports || isEdgioExport) return
      // Add all other code node from the user's next.config file
      // to final source code template
      rootBody.unshift(node)
    })
  // Add new default export to the end of the source code
  rootBody.push(newExportDefault)

  const sourceCode = root
    .toSource()
    // Remove types when we pass params as args to another function.
    // Otherwise, next build will fail with TS error.
    .replace(
      `..._preEdgioExport(_phase: string, _config: any)`,
      '..._preEdgioExport(_phase, _config)'
    )

  // Format source code and return it
  return sourceCode
    .replace(/^\s*\n(?=\s*require)/gm, '') // Remove empty lines before the require keyword, so they are on top
    .replace(/^\s*\n(?=\s*import)/gm, '') // Remove empty lines before the import keyword, so they are on top
    .replace(/^\s*[\r\n]+/gm, '\r\n') // Remove 2 or more consecutive empty lines
}
