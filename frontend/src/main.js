import Vue from 'vue'
import Febs from './FEBS'
import router from './router'
import Antd from 'ant-design-vue'
import store from './store'
import request from 'utils/request'
import db from 'utils/localstorage'
import VueApexCharts from 'vue-apexcharts'
import { API_BASE } from 'utils/runtime-config'

import 'ant-design-vue/dist/antd.css'

import 'utils/install'

Vue.config.productionTip = false
Vue.use(Antd)
Vue.use(db)
Vue.use(VueApexCharts)

Vue.component('apexchart', VueApexCharts)

// 接口前缀：来自 static/app-config.js（运行时）或 APP_API_BASE（构建时）。
// 模板里用 :action="`${apiBase}/xxx`" 取它。
Vue.prototype.$apiBase = API_BASE

// 用全局 mixin 把 apiBase 变成组件上的计算属性，
// 这样 <template> 里可以直接写 ${apiBase}，不依赖 Vue 对未定义标识符的
// 内部回退行为（生产构建压缩后不可靠）。
Vue.mixin({
  computed: {
    apiBase () {
      return this.$apiBase
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
