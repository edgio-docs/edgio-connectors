import createBuildEntryPoint from './createBuildEntryPoint'

export default createBuildEntryPoint({
  apiDistDir: './api/dist',
  webDistDir: './web/dist',
  buildCommand: 'yarn rw build',
})
