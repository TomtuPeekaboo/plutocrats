<!-- 执行组合功能后的那个组件 -->
<template>
    <div class="group">
        <div>
            <component :is="item.component" v-for="item in propValue" :id="'component' + item.id" :key="item.id"
                class="component" :style="item.groupStyle" :prop-value="item.propValue" :element="item" />
        </div>
    </div>
</template>

<script>
// import createGroupStyle from "@/utils/createGroupStyle.js";
export default {
    props: {
        propValue: {
            type: Array,
            default: () => [],
        },
        element: {
            type: Object,
            default: () => { },
        },
    },
    created() {
        // createGroupStyle(this.element);
    }
}
</script>

<style lang="less" scoped>
.group {
    &>div {
        position: relative;
        width: 100%;
        height: 100%;

        .component {
            position: absolute;
        }
    }
}
</style>
