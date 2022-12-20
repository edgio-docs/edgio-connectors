module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '16', // NODE_VERSION
        },
      },
    ],
  ],
  plugins: ['@babel/plugin-proposal-class-properties'],
}
