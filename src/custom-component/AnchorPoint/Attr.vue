<template>
    <div class="attr-list">
        <CommonAttr></CommonAttr>
        <el-form>
            <el-form-item label="内容">
                <el-input v-model="curComponent.propValue.value" type="textarea" />
            </el-form-item>
            <el-form-item label="跳转到">
                <el-input v-model="curComponent.propValue.href" type="textarea" />
            </el-form-item>
        </el-form>
    </div>
</template>

<script>
import CommonAttr from '@/custom-component/common/CommonAttr.vue'

export default {
    components: { CommonAttr },
    computed: {
        curComponent() {
            return this.$store.state.EditPage.curComponent;
        },
    },
}
</script>
