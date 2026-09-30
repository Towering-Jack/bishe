'use strict'
const utils = require('./utils')
const config = require('../config')

const isProduction = process.env.NODE_ENV === 'production'
const sourceMapEnabled = isProduction
  ? config.build.productionSourceMap
  : config.dev.cssSourceMap

module.exports = {
  // vue-loader 15 dropped vue-loader 13's `loaders` option. `css.loaders` is the
  // direct replacement and reuses the same generated loader chain; without it
  // vue-loader falls back to its own defaults and mini-css-extract-plugin ends up
  // warning "export 'default' was not found" for every style block.
  css: {
    sourceMap: sourceMapEnabled,
    extract: isProduction,
    loaders: utils.cssLoaders({
      sourceMap: sourceMapEnabled,
      extract: isProduction
    })
  },
  compilerOptions: {
    preserveWhitespace: false
  },
  cssSourceMap: sourceMapEnabled,
  cacheBusting: config.dev.cacheBusting,
  transformAssetUrls: {
    video: ['src', 'poster'],
    source: 'src',
    img: 'src',
    image: ['xlink:href', 'href'],
    use: ['xlink:href', 'href']
  }
}
