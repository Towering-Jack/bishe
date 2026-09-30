'use strict'
const path = require('path')
const webpack = require('webpack')
const { merge } = require('webpack-merge')
const TerserPlugin = require('terser-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const config = require('../config')
const baseWebpackConfig = require('./webpack.base.conf')

const webpackConfig = merge(baseWebpackConfig, {
  mode: 'production',
  module: {
    rules: require('./utils').styleLoaders({
      sourceMap: config.build.productionSourceMap,
      extract: true,
      usePostCSS: true
    })
  },
  devtool: config.build.productionSourceMap ? config.build.devtool : false,
  output: {
    path: config.build.assetsRoot,
    filename: 'static/js/[name].[contenthash:8].js',
    chunkFilename: 'static/js/[id].[contenthash:8].js',
    clean: true
  },
  optimization: {
    moduleIds: 'deterministic',
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          compress: {
            drop_console: true,
            collapse_vars: true,
            reduce_vars: true
          },
          format: {
            comments: false
          }
        }
      }),
      new CssMinimizerPlugin()
    ],
    // Replaces the three webpack 3 CommonsChunkPlugin instances.
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'initial',
          priority: 10
        },
        'vendor-async': {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor-async',
          chunks: 'async',
          minChunks: 3,
          priority: 5
        }
      }
    },
    runtimeChunk: { name: 'manifest' }
  },
  // vue-loader 15 always emits a dev-style injector that re-exports the style
  // block's default export. In a production build the styles are extracted by
  // mini-css-extract-plugin, so that stub has no default export and webpack
  // reports it once per .vue file. The CSS is still emitted correctly (verified
  // against dist/static/css), so this specific warning is noise. Nothing else is
  // suppressed.
  ignoreWarnings: [
    (warning) => {
      const text = warning && warning.message ? warning.message : String(warning)
      return text.includes('was not found in') && text.includes('&type=style')
    }
  ],
  plugins: [
    new webpack.DefinePlugin({
      'process.env': config.build.env
    }),
    new MiniCssExtractPlugin({
      filename: 'static/css/[name].[contenthash:8].css',
      chunkFilename: 'static/css/[id].[contenthash:8].css'
    }),
    new HtmlWebpackPlugin({
      filename: config.build.index,
      template: 'index.html',
      inject: true,
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeAttributeQuotes: true
      },
      chunksSortMode: 'auto'
    }),
    // copy custom static assets
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, '../static'),
          to: config.build.assetsSubDirectory,
          globOptions: { ignore: ['**/.*'] },
          noErrorOnMissing: true
        }
      ]
    })
  ]
})

if (config.build.productionGzip) {
  const CompressionPlugin = require('compression-webpack-plugin')

  webpackConfig.plugins.push(
    new CompressionPlugin({
      filename: '[path][base].gz',
      algorithm: 'gzip',
      test: /\.(js|css)$/,
      threshold: 10240,
      minRatio: 0.8,
      // static/app-config.js 是给部署的人直接编辑的，不生成 .gz，
      // 免得改错文件（改了源文件却因为 nginx 发 .gz 而不生效）。
      exclude: /app-config\.js$/
    })
  )
}

if (config.build.bundleAnalyzerReport) {
  const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
  webpackConfig.plugins.push(new BundleAnalyzerPlugin())
}

module.exports = webpackConfig
