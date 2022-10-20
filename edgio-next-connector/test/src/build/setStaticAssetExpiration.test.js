import setSsgStaticAssetExpiration from '../../../src/build/setSsgStaticAssetExpiration'

describe('setSsgStaticAssetExpiration', () => {
  let builder, setStaticAssetExpiration
  const distDir = 'dist/serverless'

  beforeEach(() => {
    setStaticAssetExpiration = jest.fn(() => builder)
    builder = { setStaticAssetExpiration }
  })

  it('should handle index.html and index.json correctly', () => {
    const manifest = {
      routes: {
        '/': {
          initialRevalidateSeconds: 10,
        },
        '/p/1': {
          initialRevalidateSeconds: 10,
        },
      },
    }

    setSsgStaticAssetExpiration(builder, manifest, distDir)

    expect(setStaticAssetExpiration).toHaveBeenCalledWith(
      'dist/serverless/pages/index.html',
      10,
      315360000
    )
    expect(setStaticAssetExpiration).toHaveBeenCalledWith(
      'dist/serverless/pages/index.json',
      10,
      315360000
    )
    expect(setStaticAssetExpiration).toHaveBeenCalledWith(
      'dist/serverless/pages/p/1.html',
      10,
      315360000
    )
    expect(setStaticAssetExpiration).toHaveBeenCalledWith(
      'dist/serverless/pages/p/1.json',
      10,
      315360000
    )
  })

  it('should only create entries when initialRevalidateSeconds is set', () => {
    const manifest = {
      routes: {
        '/foo': {},
      },
    }
    setSsgStaticAssetExpiration(builder, manifest, distDir, 'en')
    expect(setStaticAssetExpiration).not.toHaveBeenCalled()
  })

  it('should handle default locales correctly', () => {
    const manifest = {
      routes: {
        '/en': {
          initialRevalidateSeconds: 10,
        },
        '/en/p/1': {
          initialRevalidateSeconds: 10,
        },
        '/some-other-path': {
          initialRevalidateSeconds: 10,
        },
      },
    }
    setSsgStaticAssetExpiration(builder, manifest, distDir, 'en')

    expect(setStaticAssetExpiration).toHaveBeenCalledWith(
      'dist/serverless/pages/index.html',
      10,
      315360000
    )
    expect(setStaticAssetExpiration).toHaveBeenCalledWith(
      'dist/serverless/pages/index.json',
      10,
      315360000
    )
    expect(setStaticAssetExpiration).toHaveBeenCalledWith(
      'dist/serverless/pages/en.html',
      10,
      315360000
    )
    expect(setStaticAssetExpiration).toHaveBeenCalledWith(
      'dist/serverless/pages/en.json',
      10,
      315360000
    )
    expect(setStaticAssetExpiration).toHaveBeenCalledWith(
      'dist/serverless/pages/p/1.html',
      10,
      315360000
    )
    expect(setStaticAssetExpiration).toHaveBeenCalledWith(
      'dist/serverless/pages/p/1.json',
      10,
      315360000
    )
    expect(setStaticAssetExpiration).toHaveBeenCalledWith(
      'dist/serverless/pages/en/p/1.html',
      10,
      315360000
    )
    expect(setStaticAssetExpiration).toHaveBeenCalledWith(
      'dist/serverless/pages/en/p/1.json',
      10,
      315360000
    )
    expect(setStaticAssetExpiration.mock.calls.length).toBe(10)
  })
})
