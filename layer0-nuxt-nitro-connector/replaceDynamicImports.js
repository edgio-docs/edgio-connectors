const { readFileSync, writeFileSync } = require('fs')

const file = './dist/prod.js'
const contents = readFileSync(file, 'utf8').replace('__layer0DynamicImport__', 'import')

writeFileSync(file, contents, 'utf8')
