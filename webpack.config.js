const webpack = require('webpack');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const middleware = require('webpack-dev-middleware');
const WebpackHotMiddleware = require("webpack-hot-middleware");
const GlobImporter = require('node-sass-glob-importer');

const extractSass = new ExtractTextPlugin({
  filename: '[name].css',
  allChunks: true
});

const govUkPath = 'node_modules/govuk-frontend/govuk';

module.exports = {
    mode: 'development',
    plugins: [
      new CopyWebpackPlugin([
        { from: path.resolve(govUkPath, 'assets/images'), to: 'images' },
        { from: path.resolve(govUkPath, 'assets/fonts'), to: 'fonts' }
      ]),
      extractSass,
      // new webpack.HotModuleReplacementPlugin()
    ],
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      publicPath: '/'
    },
    externals: [{ window: 'window' }],
    module: {
      rules: [
        {
          test: /\.js$/,
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
          exclude: /node_modules/,
          use: extractSass.extract([
            {
              loader: 'css-loader',
              options: {
                sourceMap: true
              }
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: true,
                sassOptions: {
                  importer: GlobImporter()
                }
              }
            }
          ])
        }
      ]
    },
    entry: [
      // 'webpack-hot-middleware/client',
      path.resolve(__dirname, 'common/javascript/main.js'),
      path.resolve(__dirname, 'common/scss/main.scss')
    ],
    devtool: 'inline-source-map',
  };