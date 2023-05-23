import { join } from 'path'
import { NEXT_RUNTIME_CONFIG_FILE } from '../../../src/config/constants'
import nextRuntimeConfigExists from '../../../src/util/nextRuntimeConfigExists'
import fs from 'fs'
describe('nextRuntimeConfigExists', () => {
  let originalCwd, runtimeConfigFile

  beforeAll(() => {
    jest.resetAllMocks()
    originalCwd = process.cwd()
    process.chdir(join(__dirname, '..', '..', 'apps', 'default'))
    runtimeConfigFile = join(process.cwd(), NEXT_RUNTIME_CONFIG_FILE)
  })

  afterAll(() => {
    process.chdir(originalCwd)
    if (!fs.existsSync(runtimeConfigFile)) return
    fs.unlinkSync(runtimeConfigFile)
  })

  it('should return true when next.config.runtime.js file exists', () => {
    fs.writeFileSync(runtimeConfigFile, `module.exports={}`)
    expect(nextRuntimeConfigExists()).toBe(true)
  })

  it("should return false when next.config.runtime.js file doesn't exist", () => {
    fs.unlinkSync(runtimeConfigFile)
    expect(nextRuntimeConfigExists()).toBe(false)
  })
})
