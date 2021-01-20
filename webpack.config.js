const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");

function getVersion() {
  const curDate = new Date();
  return "" + curDate.getFullYear()
    + (curDate.getMonth() + 1)
    + curDate.getDate() + "."
    + curDate.getHours()
    + curDate.getMinutes()
    + curDate.getSeconds();
}

module.exports = (env, argv) => {
  console.log("mode: ", argv.mode);
  const isProd = argv.mode === "production";
  const version = getVersion();

  return {
    entry: ['babel-polyfill', './src/tsuro.js'],
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: '[name].bundle.js',
      library: "main",
      libraryTarget: 'umd',
      libraryExport: 'default'
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
      },
    },
    module: {
      rules: [
        {
          test: /\.m?js$/,
          exclude: /(node_modules|bower_components)/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/env']
            }
          }
        }
      ]
    },
    plugins: [
      new webpack.DefinePlugin({
        PRODUCTION: isProd,
        VERSION: version
      }),
      new CopyPlugin({
        patterns: [
          {from: "*.css", to: path.resolve(__dirname, 'build')},
          {from: "*.html", to: path.resolve(__dirname, 'build')}
        ],
      }),
      new HtmlWebpackPlugin({
        template: './index.html'
      }),
    ],
    stats: {
      colors: true
    },
    devtool: 'inline-source-map',
    devServer: {
      // contentBase: './build',
    }
  };
};