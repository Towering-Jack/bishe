<template>
  <a-modal v-model="show" title="修改车位信息" @cancel="onClose" :width="800">
    <template slot="footer">
      <a-button key="back" @click="onClose">
        取消
      </a-button>
      <a-button key="submit" type="primary" :loading="loading" @click="handleSubmit">
        修改
      </a-button>
    </template>
    <a-form :form="form" layout="vertical">
      <a-row :gutter="20">
        <a-col :span="12">
          <a-form-item label='车位编号' v-bind="formItemLayout">
            <a-input v-decorator="[
            'parkNum',
            { rules: [{ required: true, message: '请输入车位编号!' }] }
            ]"/>
          </a-form-item>
        </a-col>
       <a-col :span="12">
          <a-form-item label='苑区' v-bind="formItemLayout">
            <a-select v-decorator="[
            'community',
            { rules: [{ required: true, message: '请输入该车位所在苑区!' }] }
            ]">
                <a-select-option value="金河苑">金河苑</a-select-option>
                <a-select-option value="金沙苑">金沙苑</a-select-option>
                <a-select-option value="金景苑">金景苑</a-select-option>
                <a-select-option value="金浩苑">金浩苑</a-select-option>
                <a-select-option value="金湾苑">金湾苑</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label='车位面积' v-bind="formItemLayout">
            <a-input-number style="width: 100%" :min="1" v-decorator="[
            'area',
            { rules: [{ required: true, message: '请输入车位总面积!' }] }
            ]"/>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label='状态' v-bind="formItemLayout">
            <a-select v-decorator="[
            'status',
            { rules: [{ required: true, message: '你什么状态啊？' }] }
            ]">
              <a-select-option value="1">暂时!还没人要!</a-select-option>
              <a-select-option value="2">租出去啦</a-select-option>
              <a-select-option value="3">卖出去啦</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label='车位主人姓名' v-bind="formItemLayout">
            <a-input v-decorator="[
            'owner',
            { rules: [{ required: false }] }
            ]"/>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label='车位车主电话' v-bind="formItemLayout">
            <a-input v-decorator="[
            'phone',
            { rules: [{ required: false }] }
            ]"/>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </a-modal>
</template>

<script>
import {mapState} from 'vuex'
function getBase64 (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = error => reject(error)
  })
}
const formItemLayout = {
  labelCol: { span: 24 },
  wrapperCol: { span: 24 }
}
export default {
  name: 'ParkEdit',
  props: {
    parkEditVisiable: {
      default: false
    }
  },
  computed: {
    ...mapState({
      currentUser: state => state.account.user
    }),
    show: {
      get: function () {
        return this.parkEditVisiable
      },
      set: function () {
      }
    }
  },
  data () {
    return {
      rowId: null,
      formItemLayout,
      form: this.$form.createForm(this),
      loading: false,
      fileList: [],
      previewVisible: false,
      previewImage: ''
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
          imageList.push({uid: index, name: image, status: 'done', url: imagePrefix + image})
        })
        this.fileList = imageList
      }
    },
    setFormValues ({...Park}) {
     // console.log("test");
      this.rowId = Park.id
      let fields = ['parkNum', 'status', 'carNum', 'owner', 'phone', 'community', 'ownDate', 'area']
      let obj = {}
      Object.keys(Park).forEach((key) => {
        if (key === 'images') {
          this.fileList = []
          this.imagesInit(Park['images'])
        }
        if (key === 'status') {
          this.fileList = []
          Park[key] = Park[key].toString()
        }
        if (fields.indexOf(key) !== -1) {
          this.form.getFieldDecorator(key)
          obj[key] = Park[key]
        }
      })
      this.form.setFieldsValue(obj)
    },
    reset () {
      this.loading = false
      this.form.resetFields()
    },
    onClose () {
      this.reset()
      this.$emit('close')
    },
    handleSubmit () {
      // 获取图片List
      let images = []
      this.fileList.forEach(image => {
        images.push(image.name)
      })
      this.form.validateFields((err, values) => {
        values.id = this.rowId
        values.images = images.length > 0 ? images.join(',') : null
        if (!err) {
          this.loading = true
          this.$put('/cos/park-info', {
            ...values
          }).then((r) => {
            this.reset()
            this.$emit('success')
          }).catch(() => {
            this.loading = false
          })
        }
      })
    }
  }
}
</script>

<style scoped>

</style>