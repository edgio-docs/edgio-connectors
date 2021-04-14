module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '14', // NODE_VERSION
        },
      },
    ],
  ],
  plugins: ['@babel/plugin-proposal-class-properties'],
}
