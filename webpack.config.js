/**
 * Created by liangyong on 2017/12/19.
 */

const path = require("path");
const webpack = require("webpack");

module.exports = {
    entry: {
        shape: path.resolve(__dirname, "shape.js"),
        vendor: ["d3"]
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].js",
        library: "Topo",
        libraryTarget: "umd",
        auxiliaryComment: {
            root: "Root Comment",
            commonjs: "CommonJS Comment",
            commonjs2: "CommonJS2 Comment",
            amd: "AMD Comment"
        }
    },
    plugins: [
         new webpack.optimize.CommonsChunkPlugin({
         name: "vendor"
         }),
        new webpack.optimize.CommonsChunkPlugin({
            name: 'runtime'
        })
    ],
    module: {
        rules: [
            {
                test: /\.js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['es2015']
                    }
                }
            }
        ]
    }
}