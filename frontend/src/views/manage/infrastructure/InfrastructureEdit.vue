<template>
  <a-modal v-model="show" title="修改设施信息" @cancel="onClose" :width="800">
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
          <a-form-item label='设施名称' v-bind="formItemLayout">
            <a-input v-decorator="[
            'infrastructureName',
            { rules: [{ required: true, message: '你不曾知道我的名字。' }] }
            ]"/>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label='设施品牌' v-bind="formItemLayout">
            <a-input v-decorator="[
            'brand',
            { rules: [{ required: true, message: '哪个厂的!' }] }
            ]"/>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label='所属苑区' v-bind="formItemLayout">
             <a-select v-decorator="[
            'community',
            { rules: [{ required: true, message: '不要问我从哪里来' }] }
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
          <a-form-item label='投入使用日期' v-bind="formItemLayout">
             <a-date-picker
                type="useDate"
                :editable="false"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                :clearable="false" 
                v-decorator="[
                'useDate',
                   { rules: [{ required: true, message: '噢！是何年何月何日？开启了你的新征程' }] }
                ]"
              />
          </a-form-item>
        </a-col>
        
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </a-modal>
</template>

<script>
import {mapState} from 'vuex'
import moment from "moment";
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
  name: 'InfrastructureEdit',
  props: {
    infrastructureEditVisiable: {
      default: false
    }
  },
  computed: {
    ...mapState({
      currentUser: state => state.account.user
    }),
    show: {
      get: function () {
        return this.infrastructureEditVisiable
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
    setFormValues ({...infrastructure}) {
    console.log("?");
      this.rowId = infrastructure.id
      let fields = ['infrastructureName', 'useDate', 'community', 'brand']
      let obj = {}
      Object.keys(infrastructure).forEach((key) => {
        if (key == "useDate") {
            infrastructure[key] = moment(infrastructure[key]);
          }
        if (fields.indexOf(key) !== -1) {
          this.form.getFieldDecorator(key)
          obj[key] = infrastructure[key]
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
          this.$put('/cos/infrastructure-info', {
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
