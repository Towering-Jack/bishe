'use strict'
const path = require('path')
const webpack = require('webpack')
const { VueLoaderPlugin } = require('vue-loader')
const config = require('../config')
const vueLoaderConfig = require('./vue-loader.conf')

function resolve (dir) {
  return path.join(__dirname, '..', dir)
}

module.exports = {
  // webpack 5 requires an explicit mode; the dev/prod configs may override it.
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  context: path.resolve(__dirname, '../'),
  entry: {
    app: './src/main.js'
  },
  output: {
    path: config.build.assetsRoot,
    filename: '[name].js',
    publicPath: process.env.NODE_ENV === 'production'
      ? config.build.assetsPublicPath
      : config.dev.assetsPublicPath
  },
  resolve: {
    extensions: ['.js', '.vue', '.json'],
    alias: {
      vue$: 'vue/dist/vue.esm.js',
      '@': resolve('src'),
      '~': resolve('src/components'),
      utils: resolve('src/utils')
    },
    fallback: {
      // Client-side bundle: none of these Node core modules are needed. webpack 5
      // no longer polyfills them automatically, so resolve them to `false`
      // rather than pulling in the old `node: { fs: 'empty' }` shims.
      fs: false,
      net: false,
      tls: false,
      dgram: false,
      child_process: false
    }
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: vueLoaderConfig
      },
      {
        test: /\.m?js$/,
        loader: 'babel-loader',
        include: [resolve('src')]
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        type: 'asset',
        parser: {
          dataUrlCondition: { maxSize: 10000 }
        },
        generator: {
          filename: 'static/img/[name].[hash:7][ext][query]'
        }
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        type: 'asset',
        parser: {
          dataUrlCondition: { maxSize: 10000 }
        },
        generator: {
          filename: 'static/media/[name].[hash:7][ext][query]'
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        type: 'asset',
        parser: {
          dataUrlCondition: { maxSize: 10000 }
        },
        generator: {
          filename: 'static/fonts/[name].[hash:7][ext][query]'
        }
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    // Ignore all locale files of moment.js; locales are loaded explicitly at runtime.
    new webpack.IgnorePlugin({ resourceRegExp: /^\.\/locale$/, contextRegExp: /moment$/ }),
    // src/utils/runtime-config.js 在运行时读取 window.__APP_CONFIG__；
    // 这里注入的构建期值是它的兜底（可用环境变量覆盖）。
    new webpack.DefinePlugin({
      APP_API_BASE: JSON.stringify(process.env.APP_API_BASE || '/api'),
      APP_IMAGE_BASE: JSON.stringify(process.env.APP_IMAGE_BASE || '/propertyCosImg')
    })
  ],
  // Suppress the noisy "module not found" hints for optional peer deps.
  stats: {
    modules: false,
    children: false
  }
}
