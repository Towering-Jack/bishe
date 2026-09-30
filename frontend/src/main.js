import Vue from 'vue'
import Febs from './FEBS'
import router from './router'
import Antd from 'ant-design-vue'
import store from './store'
import request from 'utils/request'
import db from 'utils/localstorage'
import VueApexCharts from 'vue-apexcharts'
import { API_BASE, IMAGE_PREFIX } from 'utils/runtime-config'

import 'ant-design-vue/dist/antd.css'

import 'utils/install'

Vue.config.productionTip = false
Vue.use(Antd)
Vue.use(db)
Vue.use(VueApexCharts)

Vue.component('apexchart', VueApexCharts)

// 地址前缀：来自 static/app-config.js（运行时）或构建期环境变量。
//   $apiBase     后端接口前缀，模板里写 :action="`${apiBase}/xxx`"
//   $imagePrefix 图片前缀（以 /imagesWeb/ 结尾），模板里直接拼：
//                :src="imagePrefix + item.images.split(',')[0]"
//                刻意做成字符串而不是函数，这样模板里一个引号都不用写，
//                避免在双引号 HTML 属性内部出现引号嵌套把属性提前截断。
Vue.prototype.$apiBase = API_BASE
Vue.prototype.$imagePrefix = IMAGE_PREFIX

// 用全局 mixin 把它们变成组件上的计算属性，这样 <template> 里可以直接用，
// 不依赖 Vue 对未定义标识符的内部回退行为（生产构建压缩后不可靠）。
Vue.mixin({
  computed: {
    apiBase () {
      return this.$apiBase
    },
    imagePrefix () {
      return this.$imagePrefix
    }
  }
})

Vue.use({
  install (Vue) {
    Vue.prototype.$db = db
  }
})

Vue.prototype.$post = request.post
Vue.prototype.$get = request.get
Vue.prototype.$put = request.put
Vue.prototype.$delete = request.delete
Vue.prototype.$export = request.export
Vue.prototype.$download = request.download
Vue.prototype.$upload = request.upload

/* eslint-disable no-new */
new Vue({
  router,
  store,
  render: h => h(Febs)
}).$mount('#febs')
