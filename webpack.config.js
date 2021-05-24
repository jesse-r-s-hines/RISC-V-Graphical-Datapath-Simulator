// see https://webpack.js.org/guides/typescript/
// see https://sysgears.github.io/mochapack/docs/installation/webpack-configuration.html
const path = require('path');
const { optimize } = require('svgo');

module.exports = (env) => ({
  entry: './src/index.ts',
  devtool: (env.prod) ? undefined : 'inline-source-map',
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
          type: 'asset/resource',
          use: [
            {
              loader: 'svgo-loader',
              options: {
                configFile:  path.resolve(__dirname, "./svgo.config.js"),
              }
            }
          ],
          include: path.resolve(__dirname, "assets"),
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(svg|woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
        generator: {filename: 'fonts/[hash][ext][query]'},
        include: path.resolve("./node_modules/")
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
    clean: true,
  },
  optimization: {
    minimize: env.prod ? true : false // Debugger has trouble if you minify, even with the source map.
  },
  externals: env.test ? [require('webpack-node-externals')()] : undefined, // in order to ignore all modules in node_modules folder
});