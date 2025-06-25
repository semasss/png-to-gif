const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    mode: isProduction ? 'production' : 'development',
    target: 'electron-renderer',
    entry: './src/react/index.jsx',
    output: {
      path: path.resolve(__dirname, 'dist/react'),
      filename: isProduction ? 'bundle.[name].[contenthash].js' : 'bundle.js',
      publicPath: './',
      clean: true,
    },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/react/index.html',
      filename: 'index.html'
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/react/assets',
          to: 'assets'
        }
      ]
    }),
    new webpack.DefinePlugin({
      global: 'globalThis',
      'process.env.WEBPACK_BUILD': JSON.stringify(Date.now())
    }),
    new webpack.ProvidePlugin({
      global: 'globalThis',
    })
  ],
  devtool: isProduction ? false : 'source-map',
  optimization: {
    splitChunks: isProduction ? {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\/\\]node_modules[\/\\]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    } : false,
  },
  performance: {
    hints: isProduction ? 'warning' : false,
    maxAssetSize: 1000000,
    maxEntrypointSize: 1000000,
  }
  };
};