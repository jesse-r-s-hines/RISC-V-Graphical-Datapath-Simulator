// see https://webpack.js.org/guides/typescript/
const path = require('path');

module.exports = {
  entry: './src/index.ts',
  devtool: 'source-map',
  mode: "production",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'risc-v-simulator.js',
    path: path.resolve(__dirname, 'dist'),
  },
  optimization: {
    minimize: false // VSCode debugger has trouble if you minify, even with the source map.
},
};