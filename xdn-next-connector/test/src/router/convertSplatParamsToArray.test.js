import { convertSplatParamsToArray } from '../../../src/router/convertSplatParamsToArray'

describe('convertSplatParamsToArray', () => {
  it('should convert a single string value to an array', () => {
    const page = '/guides/[guide]/[...path]'

    const params = {
      guide: 'getting_started',
      path: 'extra/tokens',
    }

    expect(convertSplatParamsToArray(page, params)).toEqual({
      guide: 'getting_started',
      path: ['extra', 'tokens'],
    })

    expect(params).toEqual({
      guide: 'getting_started',
      path: 'extra/tokens',
    })
  })

  it('should return undefined when params are not provided', () => {
    expect(convertSplatParamsToArray('/')).toBe(undefined)
  })
})
