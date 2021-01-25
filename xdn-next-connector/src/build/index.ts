import getDistDir from '../util/getDistDir'
import createBuildEntryPoint from './createBuildEntryPoint'

export default createBuildEntryPoint({
  srcDir: '.',
  distDir: getDistDir(),
  buildCommand: 'npx next build',
})
