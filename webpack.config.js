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
        entry: [path.join(__dirname, 'src/index.tsx')],
        output: {
            filename: '[name]-[contenthash].bundle.js',
            path: path.join(__dirname, 'dist'),
            clean: true,
        },
        devtool: (env.prod) ? 'source-map' : 'inline-source-map', // inline-source-map makes debugging work better.
        target: (env.test) ? "node" : "web",
        plugins: [
            new MiniCssExtractPlugin(),
            new HtmlWebpackPlugin({
                filename: 'index.html',
                template: path.join(__dirname, "src/index.html.ejs"),
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
                            options: { configFile:  path.join(__dirname, "svgo.config.js") }
                        }
                    ],
                    generator: {filename: "[name]-[hash][ext][query]"},
                    include: path.join(__dirname, "assets"),
                },
                {
                    test: /\.css$/i,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                            options: {
                                modules: {
                                    auto: /\.m\.css$/i,
                                    localIdentName: env.prod ? '[hash:base64:16]' : '[name]-[local]-[hash:base64:5]',
                                }
                            }
                        }
                    ],
                },
                {
                    test: /\.(s|asm)$/, // assembly examples
                    type: 'asset/resource',
                    generator: {filename: 'assembly/[name]-[hash][ext][query]'},
                },
                {
                    test: /\.ne$/,
                    use: ['nearley-loader'],
                    include: path.join(__dirname, "src"),
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
            modules: [path.join(__dirname, 'src'), 'node_modules'],
            alias: {
                assets: path.join(__dirname, 'assets'),
                css: path.join(__dirname, 'css'),
            },
        },
        optimization: {
            minimize: !!env.prod, // Debugger has trouble if you minify, even with the source map.
        },
        devServer: {
            static: path.join(__dirname, 'dist'),
        },
    };

    return config;
}


