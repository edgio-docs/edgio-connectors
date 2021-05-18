import getNamespace from '../../src/server/getNamespace'

describe('getNamespace', () => {
  it('should only create a single namespace', () => {
    const ns1 = getNamespace()
    const ns2 = getNamespace()
    expect(ns1).toEqual(ns2)
  })
})
