import { API, FileInfo } from 'jscodeshift'

const OLD_EXPORT = '_oldExport'

module.exports = function transformConfig(fileInfo: FileInfo, api: API) {
  // Do not transform the config file mulitple times
  if (fileInfo.source.indexOf('@edgio') !== -1) {
    return fileInfo.source
  }

  const j = api.jscodeshift
  const root = j(fileInfo.source)

  const defaultExport = root.find(j.ExportDefaultDeclaration)

  const existingExportVar = j.identifier(OLD_EXPORT)

  // Replace current default export with a const so we can modify it
  defaultExport.replaceWith(
    j.variableDeclaration('const', [
      j.variableDeclarator(
        existingExportVar,
        defaultExport.get().parentPath.value[0].declarations[0].id
      ),
    ])
  )

  const rootBody = root.get('program').get('body').value

  // Add needed import
  rootBody.unshift("import createAdapter from '@edgio/sveltekit/adapter.js';")

  // Modify the config
  rootBody.push(`${OLD_EXPORT}.kit.adapter = createAdapter();`)

  // Add a new default export
  rootBody.push(`export default ${OLD_EXPORT}`)

  return root.toSource()
}
