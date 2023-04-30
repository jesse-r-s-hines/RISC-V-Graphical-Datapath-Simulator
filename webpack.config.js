// @ts-check

// see https://webpack.js.org/guides/typescript/
// see https://sysgears.github.io/mochapack/docs/installation/webpack-configuration.html
const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
    /** @type { import('webpack').Configuration } */
    const config =  {
        mode: (env.prod) ? "production" : "development",
        entry: [path.resolve(__dirname, 'src/index.tsx')],
        output: {
            filename: '[name]-[contenthash].bundle.js',
            path: path.resolve(__dirname, 'dist'),
            clean: true,
        },
        devtool: (env.prod) ? 'source-map' : 'inline-source-map', // inline-source-map makes debugging work better.
        target: (env.test) ? "node" : "web",
        plugins: [
            new MiniCssExtractPlugin(),
            new HtmlWebpackPlugin({
                template: "./index.html",
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
    };

    return config;
}


