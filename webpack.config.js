const  path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: ['babel-polyfill', './src/tsuro.js'],
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'main.bundle.js',
    library: "Main",
    libraryTarget: 'umd',
    libraryExport: 'default'
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