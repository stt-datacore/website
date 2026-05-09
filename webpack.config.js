module.exports = {
  module: {
    rules: [
      {
        test: /\.(ttf|otf|eot|woff|woff2)$/,
        type: 'asset/resource'
      },
      {
        test: /\.(ttf|otf|eot|woff|woff2)$/,
        type: 'asset/inline'  // ensures inlined base64 works
      }
    ]
  }
}