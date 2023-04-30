// see https://webpack.js.org/guides/typescript/
// see https://sysgears.github.io/mochapack/docs/installation/webpack-configuration.html
const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');

// env.prod, env.dev, or env.test can be set.
module.exports = (env) => ({
  entry: {
    main: {
      import: './src/index.tsx',
    },
  },
  devtool: (env.prod) ? 'source-map' : 'inline-source-map', // inline-source-map makes debugging work better.
  mode: (env.prod) ? "production" : "development",
  target: (env.test) ? "node" : "web",
  plugins: [
    new MiniCssExtractPlugin(),
    new HtmlWebpackPlugin({
      template: "./index.html",
      minify: false,
    }),
  ],
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
            options: { configFile:  path.resolve(__dirname, "./svgo.config.js") }
          }
        ],
        generator: {filename: "[name]-[hash][ext][query]"},
        include: path.resolve(__dirname, "assets"),
      },
      {
        test: /\.html$/,
        loader: 'html-loader',
        options: {
          minimize: false,
        },
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.(svg|woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
        generator: {filename: 'fonts/[name]-[hash][ext][query]'},
        include: path.resolve("./node_modules/")
      },
      {
        test: /\.(s|asm)$/, // assembly examples
        type: 'asset/resource',
        generator: {filename: 'assembly/[name]-[hash][ext][query]'},
      },
      {
        test: /\.ne$/,
        use: ['nearley-loader'],
        include: path.resolve(__dirname, "src"),
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
    alias: {
      assets: path.resolve(__dirname, 'assets'),
      css: path.resolve(__dirname, 'css'),
    },
  },
  optimization: {
    minimize: env.prod ? true : false // Debugger has trouble if you minify, even with the source map.
  },
  devServer: {
    static: path.join(__dirname, 'dist'),
  },
  externals: env.test ? [require('webpack-node-externals')()] : undefined, // in order to ignore all modules in node_modules folder
});