import createBuildEntryPoint from './createBuildEntryPoint'
import getHydrogenCommand from '../utils/getHydrogenCommand'

export default createBuildEntryPoint({
  buildCommand: getHydrogenCommand('build'),
})
