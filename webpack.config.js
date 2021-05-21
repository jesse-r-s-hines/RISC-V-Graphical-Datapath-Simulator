// see https://webpack.js.org/guides/typescript/
// see https://sysgears.github.io/mochapack/docs/installation/webpack-configuration.html
const path = require('path');
const { optimize } = require('svgo');

module.exports = (env) => ({
  entry: './src/index.ts',
  devtool: 'source-map',
  mode: (env.prod) ? "production" : "development",
  target: (env.test) ? "node" : "web",
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
      {
        test: /\.ne$/,
        use: [
          'nearley-loader',
        ],
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
    minimize: env.prod ? true : false // Debugger has trouble if you minify, even with the source map.
  },
  externals: env.test ? [require('webpack-node-externals')()] : undefined, // in order to ignore all modules in node_modules folder
});