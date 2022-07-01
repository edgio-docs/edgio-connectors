import { join, dirname } from 'path'
import { copyFileSync, unlinkSync, readFileSync } from 'fs-extra'
import { transformNuxtConfig } from '../../src/utils/transformNuxtConfig'

const pathToOriginalTestConfig = join(__dirname, '../apps/default-commercetools/nuxt.config.js')
const pathToExpectedTestConfig = join(
  __dirname,
  '../apps/default-commercetools/expected-nuxt.config.js'
)

let testFilePath = ''

describe('nuxt-config codemod', () => {
  beforeEach(() => {
    testFilePath = `${join(dirname(pathToOriginalTestConfig), 'nuxt-test.config.js')}`
    copyFileSync(pathToOriginalTestConfig, testFilePath)
  })

  it('nuxt config is correctly transformed', () => {
    transformNuxtConfig(testFilePath)

    const testFile = readFileSync(testFilePath)
    const expectedFile = readFileSync(pathToExpectedTestConfig)

    expect(testFile.toString()).toBe(expectedFile.toString())
  })

  afterEach(() => {
    unlinkSync(testFilePath)
  })
})
