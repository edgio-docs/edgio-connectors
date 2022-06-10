import setSsgStaticAssetExpiration from '../../../src/build/setSsgStaticAssetExpiration'

describe('setSsgStaticAssetExpiration', () => {
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

    const setStaticAssetExpiration = jest.fn(() => builder)

    const builder = {
      setStaticAssetExpiration,
    }

    const distDir = 'dist/serverless'

    setSsgStaticAssetExpiration(builder, manifest, distDir)

    expect(setStaticAssetExpiration).toHaveBeenCalledWith(
      'dist/serverless/pages/index.html',
      10,
      10
    )
    expect(setStaticAssetExpiration).toHaveBeenCalledWith(
      'dist/serverless/pages/index.json',
      10,
      10
    )
    expect(setStaticAssetExpiration).toHaveBeenCalledWith('dist/serverless/pages/p/1.html', 10, 10)
    expect(setStaticAssetExpiration).toHaveBeenCalledWith('dist/serverless/pages/p/1.json', 10, 10)
  })
})
