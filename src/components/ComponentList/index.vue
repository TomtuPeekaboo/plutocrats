<!-- 左边属性导航菜单-->
<template>
    <div class="component-list" @dragstart="handleDragStart">
        <div v-for="(item, index) in componentList" :key="index" class="list" draggable :data-index="index">
            <span class="iconfont" :class="item.icon"></span>
        </div>
    </div>
</template>

<script>
import componentList from '@/custom-component/component-list'

export default {
    data() {
        return {
            componentList,
        }
    },
    methods: {
        // 传输数据
        handleDragStart(e) {
            e.dataTransfer.setData('index', e.target.dataset.index);
        },
    },
}
</script>

<style lang="less" scoped>
.component-list {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    padding: 10px;

    .list {
        width: 45%;
        height: 40px;
        border: 1px solid #ddd;
        cursor: grab;
        margin-bottom: 10px;
        text-align: center;
        color: #333;
        padding: 2px 5px;
        display: flex;
        align-items: center;
        justify-content: center;

        &:active {
            cursor: grabbing;
        }

        .iconfont {
            margin-right: 4px;
            font-size: 20px;
        }

        .icon-wenben,
        .icon-tupian {
            font-size: 18px;
        }
    }
}
</style>
