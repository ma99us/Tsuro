const  path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
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
    new CopyPlugin({
      patterns: [
        { from: "*.css", to: path.resolve(__dirname, 'build') },
        { from: "*.html", to: path.resolve(__dirname, 'build') }
      ],
    }),
    new HtmlWebpackPlugin({
      template: './index.html'
    })
  ],
  stats: {
    colors: true
  },
  devtool: 'inline-source-map',
  devServer: {
    // contentBase: './build',
  },
};