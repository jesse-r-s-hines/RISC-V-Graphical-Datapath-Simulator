// see https://webpack.js.org/guides/typescript/
const path = require('path');
const { optimize } = require('svgo');

module.exports = {
  entry: './src/index.ts',
  devtool: 'source-map',
  mode: "development",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.svg/,
        type: 'asset/inline',
        generator: {
          dataUrl: content => {
            content = content.toString();
            return optimize(content, {
              plugins: [
                "convertStyleToAttrs",
              ],
            }).data;
          }
        },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        loader: 'file-loader', // TODO: file-loader is deprecated. Change to asset modules.
        options: {
          outputPath: 'fonts',
        }
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