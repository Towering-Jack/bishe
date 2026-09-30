<template>
  <a-modal v-model="show" title="车位信息" @cancel="onClose" :width="800">
    <template slot="footer">
      <a-button key="back" @click="onClose" type="danger">
        关闭
      </a-button>
    </template>
    <div style="font-size: 13px" v-if="parkData !== null">
      <a-row style="padding-left: 24px;padding-right: 24px;">
        <a-col style="margin-bottom: 15px"><span style="font-size: 15px;font-weight: 650;color: #000c17">基础信息</span></a-col>
        <a-col :span="8"><b>车位编号：</b>
          {{ parkData.parkNum }}
        </a-col>
        <a-col :span="8"><b>所属苑区：</b>
          <a-tooltip>
            {{ parkData.community }}
          </a-tooltip>
        </a-col>
        <a-col :span="8"><b>车位面积：</b>
          {{ parkData.area }} ㎡
        </a-col>
      </a-row>
      <br/>
      <a-row style="padding-left: 24px;padding-right: 24px;">
        <a-col :span="8"><b>车位主人：</b>
          {{ parkData.owner }}
        </a-col>
        <a-col :span="8"><b>联系方式：</b>
          {{ parkData.phone }} 
        </a-col>
        <a-col :span="8"><b>租/售出时间：</b>
          {{ parkData.ownDate }}
        </a-col>
      </a-row>
      <br/>
      <br/>
    </div>
  </a-modal>
</template>

<script>
import moment from 'moment'
moment.locale('zh-cn')
function getBase64 (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = error => reject(error)
  })
}
export default {
  name: 'ParkView',
  props: {
    parkShow: {
      type: Boolean,
      default: false
    },
    parkData: {
      type: Object
    }
  },
  computed: {
    show: {
      get: function () {
        return this.parkShow
      },
      set: function () {
      }
    }
  },
  data () {
    return {
      loading: false,
      fileList: [],
      previewVisible: false,
      previewImage: '',
      replyList: []
    }
  },
  watch: {
    parkShow: function (value) {
      if (value && this.parkData.images !== null && this.parkData.images !== '') {
        this.imagesInit(this.parkData.images)
      }
    }
  },
  methods: {
    handleCancel () {
      this.previewVisible = false
    },
    async handlePreview (file) {
      if (!file.url && !file.preview) {
        file.preview = await getBase64(file.originFileObj)
      }
      this.previewImage = file.url || file.preview
      this.previewVisible = true
    },
    picHandleChange ({ fileList }) {
      this.fileList = fileList
    },
    imagesInit (images) {
      if (images !== null && images !== '') {
        let imageList = []
        images.split(',').forEach((image, index) => {
          imageList.push({uid: index, name: image, status: 'done', url: `${apiUrl("/imagesWeb/")}` + image})
        })
        this.fileList = imageList
      }
    },
    onClose () {
      this.$emit('close')
    }
  }
}
</script>

<style scoped>

</style>