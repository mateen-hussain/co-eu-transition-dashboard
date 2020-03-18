const webpack = require('webpack');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const middleware = require('webpack-dev-middleware');
const WebpackHotMiddleware = require("webpack-hot-middleware");
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');

const webpackSettings = () => {
  const govUkPath = 'node_modules/govuk-frontend/govuk';
  const publicPath = 'common';

  return {
    mode: 'development',
    plugins: [
      new HardSourceWebpackPlugin({ info: { level: 'error' } }),
      new HardSourceWebpackPlugin.ExcludeModulePlugin([{
        test: /mini-css-extract-plugin[\\/]dist[\\/]loader/,
      }]),
      new CopyWebpackPlugin([
        { from: path.resolve(govUkPath, 'assets/images'), to: 'images' },
        { from: path.resolve(govUkPath, 'assets/fonts'), to: 'fonts' },
        { from: path.resolve(publicPath, 'images'), to: 'images' }
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
            { loader: 'css-loader' },
            { loader: 'sass-loader', options: { sourceMap: true } },
          ]
        }
      ]
    },
    entry: [
      'webpack-hot-middleware/client',
      path.resolve(__dirname, '..', 'common/javascript/main.js'),
      path.resolve(__dirname, '..', 'common/scss/main.scss')
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
