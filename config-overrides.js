const path = require('path');

module.exports = {
  paths: function (paths, env) {
    paths.appPublic = path.resolve(__dirname, 'static');
    paths.appHtml = path.resolve(__dirname, 'static/index.html');
    return paths;
  },

  webpack: function (config, env) {
    // Font handling: choose asset/resource OR asset/inline, not both.
    config.module.rules.push({
      test: /\.(ttf|otf|eot|woff|woff2)$/i,
      type: 'asset/resource',
    });

    const oneOfRule = config.module.rules.find(rule => Array.isArray(rule.oneOf));

    const babelLoader = oneOfRule?.oneOf.find(
      rule =>
        rule.loader &&
        rule.loader.includes('babel-loader') &&
        rule.options
    );

    if (babelLoader) {
      babelLoader.options.plugins = [
        [
          require.resolve('@babel/plugin-transform-typescript'),
          {
            allowDeclareFields: true,
          },
          'allow-declare-fields',
        ],
        ...(babelLoader.options.plugins || []),
      ];
    }
    config.module.rules.push({
        test: /\.(ttf|otf|eot|woff|woff2)$/i,
        type: 'asset/inline',
    });
    return config;
  },
};