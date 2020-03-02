const webpack = require('webpack');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const middleware = require('webpack-dev-middleware');
const WebpackHotMiddleware = require("webpack-hot-middleware");
const GlobImporter = require('node-sass-glob-importer');

const webpackSettings = () => {
  const govUkPath = 'node_modules/govuk-frontend/govuk';

  return {
    mode: 'development',
    plugins: [
      new CopyWebpackPlugin([
        { from: path.resolve(govUkPath, 'assets/images'), to: 'images' },
        { from: path.resolve(govUkPath, 'assets/fonts'), to: 'fonts' }
      ]),
      new webpack.HotModuleReplacementPlugin(),
      new MiniCssExtractPlugin()
    ],
    output: {
      path: path.resolve(__dirname, '..', 'dist'),
      publicPath: '/assets/',
      filename: '[name].js'
    },
    externals: [{ window: 'window' }],
    module: {
      rules: [
        {
          test: /\.js$/,
          include: path.resolve(__dirname, '..', 'common'),
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: { presets: ['@babel/env'] }
            }
          ]
        },
        {
          test: /\.scss$/,
          include: path.resolve(__dirname, '..', 'common'),
          exclude: /node_modules/,
          use: [
            'css-hot-loader',
            MiniCssExtractPlugin.loader,
            { loader: 'css-loader', options: { sourceMap: true, importLoaders: 1 } },
            { loader: 'sass-loader', options: { sourceMap: true, sassOptions: { importer: GlobImporter() } } },
          ]
        }
      ]
    },
    entry: [
      'webpack-hot-middleware/client',
      path.resolve(__dirname, '..', 'common/javascript/main.js'),
      path.resolve(__dirname, '..', 'common/scss/main.scss'),
      path.resolve(govUkPath, 'all.js')
    ]
  };
};

const configure = app => {
  const settings = webpackSettings();
  const compiler = webpack(settings);

  app.use(middleware(compiler, {
    publicPath: '/assets/',
    logLevel: 'warn'
  }));

  app.use(WebpackHotMiddleware(compiler));
};

module.exports = { configure };
