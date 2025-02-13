//vee-validate插件;表单验证区域
import Vue from "vue";
import VeeValidate from "vee-validate";
//引入进来的是vee-valadiate提供信息提示【中文的】
import zh_CN from 'vee-validate/dist/locale/zh_CN';
const config = {
    locale: 'zh_CN',
    // errorBagName: 'errorBags',//change if property conflicts
    fieldsBagName:'fieldBags'

};
Vue.use(VeeValidate,config)

//表单的验证
VeeValidate.Validator.localize('zh_CN', {
    messages: {
        ...zh_CN.messages,//给VeeValidate插件提供【中文提示功能】
        is: (field) => `${field}必须与密码相同` // 修改内置规则的 message，让确认密码和密码相同
    },
    //注册：有五个字段：phone、code、password、password1、agree【将来用中文显示，别用英文】
    attributes: { // 给校验的 field 属性名映射中文名称
        username: '账号',
        code: '验证码',
        password: '密码',
        confirmPwd: '确认密码',
        agree: '协议'
    }
})


//这个是vee-valadiate自定义校验规则-->同意复选框先关的
/* VeeValidate.Validator.extend('agree', {
    validate: value => {
        return value
    },
    getMessage: field => field + '必须同意'
}) */
