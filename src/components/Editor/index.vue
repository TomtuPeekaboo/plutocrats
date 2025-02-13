<template>
    <div id="editor" class="editor" 
        :class="{ edit: isEdit }" 
        :style="{
            width: changeStyleWithScale(canvasStyleData.width) + 'px',
            height: changeStyleWithScale(canvasStyleData.height) + 'px',
            background: canvasStyleData.background,
            left:canvasStyleData.left,
            top:canvasStyleData.top
        }" 
        @contextmenu="handleContextMenu" 
        @mousedown="handleMouseDown"
    >
        <!-- 网格线 -->
        <Grid />

        <!--页面组件列表展示-->
        <!-- Shape 用来控制8个点 -->
        <!-- componentData是画布上的组件数组，每次取出一个然后判断是哪种组件然后进行渲染-->
        <Shape 
            v-for="(item, index) in componentData" 
            :key="item.id" 
            :default-style="item.style"
            :style="getShapeStyle(item.style)" 
            :active="item.id === (curComponent || {}).id" 
            :element="item"
            :index="index" 
            :class="{ lock: item.isLock }"
        >
            <component 
                :is="item.component" 
                v-if="item.component.startsWith('SVG')" 
                :id="'component' + item.id"
                :style="getSVGStyle(item.style)" 
                class="component" 
                :prop-value="item.propValue" 
                :element="item"
            ></component>
            <component 
                :is="item.component" 
                v-else-if="(item.component != 'VText'&&item.component != 'AnchorPoint')" 
                :id="'component' + item.id"
                class="component" 
                :style="getComponentStyle(item.style)" 
                :prop-value="item.propValue" 
                :element="item"
            ></component>
            <component 
                :is="item.component" 
                v-else :id="'component' + item.id" 
                class="component"
                :style="getComponentStyle(item.style)" 
                :prop-value="item.propValue" 
                :element="item"
            ></component>
        </Shape>
        <!-- 右击菜单 -->
        <ContextMenu />
        <!-- 标线 -->
        <MarkLine />
        <!-- 选中区域 -->
        <Area v-show="isShowArea" :start="start" :width="width" :height="height" />
    </div>
</template>

<script>
import { mapState } from 'vuex'
import Shape from './Shape'
import { getStyle, getComponentRotatedStyle, getShapeStyle, getSVGStyle } from '@/utils/style'
import { $, isPreventDrop } from '@/utils/utils'
import ContextMenu from './ContextMenu'
import MarkLine from './MarkLine'
import Area from './Area'
import eventBus from '@/utils/eventBus'
import Grid from './Grid'
import { changeStyleWithScale } from '@/utils/translate';



export default {
    components: { Shape, ContextMenu, MarkLine, Area, Grid},
    props: {
        isEdit: {
            type: Boolean,
            default: true,
        },
    },
    data() {
        return {
            editorX: 0,
            editorY: 0,
            start: { // 选中区域的起点
                x: 0,
                y: 0,
            },
            width: 0,
            height: 0,
            isShowArea: false, // 选框区域
            svgFilterAttrs: ['width', 'height', 'top', 'left', 'rotate'],
        }
    },
    computed: mapState('EditPage', [
        'componentData',
        'curComponent',
        'canvasStyleData',
        'editor',
    ]),
    mounted() {
        // 获取编辑器元素
        this.$store.commit('EditPage/getEditor');
        eventBus.$on('hideArea', () => {
            this.hideArea()
        })
    },
    methods: {
        changeStyleWithScale,
        getShapeStyle,
        /* 
        组件在画布中移动
        首先需要将画布设为相对定位 position: relative，然后将每个组件设为绝对定位 position: absolute。
        除了这一点外，还要通过监听三个事件来进行移动：

        1.  mousedown 事件，在组件上按下鼠标时，记录组件当前的位置，即 xy 坐标
        （为了方便讲解，这里使用的坐标轴，实际上 xy 对应的是 css 中的 left 和 top。
        2. mousemove 事件，每次鼠标移动时，都用当前最新的 xy 坐标减去最开始的 xy 坐标，从而计算出移动距离，再改变组件位置。
        3. mouseup 事件，鼠标抬起时结束移动。
        */
        handleMouseDown(e) {
            // 如果没有选中组件 在画布上点击时需要调用 e.preventDefault() 防止触发 drop 事件
            if (!this.curComponent || (isPreventDrop(this.curComponent.component))) {
                e.preventDefault()
            }

            this.hideArea();

            // 获取编辑器的位移信息，每次点击时都需要获取一次。
            const rectInfo = this.editor.getBoundingClientRect();
            this.editorX = rectInfo.x;
            this.editorY = rectInfo.y;

            const startX = e.clientX;
            const startY = e.clientY;
            this.start.x = startX - this.editorX;
            this.start.y = startY - this.editorY;
            // 展示选中区域
            this.isShowArea = true;

            const move = (moveEvent) => {
                this.width = Math.abs(moveEvent.clientX - startX)
                this.height = Math.abs(moveEvent.clientY - startY)
                if (moveEvent.clientX < startX) {
                    this.start.x = moveEvent.clientX - this.editorX
                }

                if (moveEvent.clientY < startY) {
                    this.start.y = moveEvent.clientY - this.editorY
                }
            }

            const up = (e) => {
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', up);

                if (e.clientX == startX && e.clientY == startY) {
                    this.hideArea();
                    return;
                }

                this.createGroup();
            }

            document.addEventListener('mousemove', move)
            document.addEventListener('mouseup', up)
        },

        hideArea() {
            this.isShowArea = 0
            this.width = 0
            this.height = 0

            this.$store.commit('EditPage/setAreaData', {
                style: {
                    left: 0,
                    top: 0,
                    width: 0,
                    height: 0,
                },
                components: [],
            })
        },

        createGroup() {
            // 获取选中区域的组件数据
            const areaData = this.getSelectArea()
            if (areaData.length <= 1) {
                this.hideArea()
                return
            }

            // 根据选中区域和区域中每个组件的位移信息来创建 Group 组件
            // 要遍历选择区域的每个组件，获取它们的 left top right bottom 信息来进行比较
            //取得选中区域的最左、最上、最右、最下四个方向的数值，从而得出一个能包含区域内所有组件的最小区域
            let top = Infinity, left = Infinity
            let right = -Infinity, bottom = -Infinity
            
            areaData.forEach(component => {
                let style = {};
                if (component.component == 'Group') {
                    component.propValue.forEach(item => {
                        //获取每个组件相对于浏览器视口四个方向上的信息
                        const rectInfo = $(`#component${item.id}`).getBoundingClientRect();
                        style.left = rectInfo.left - this.editorX;
                        style.top = rectInfo.top - this.editorY;
                        style.right = rectInfo.right - this.editorX;
                        style.bottom = rectInfo.bottom - this.editorY;

                        if (style.left < left) left = style.left;
                        if (style.top < top) top = style.top;
                        if (style.right > right) right = style.right;
                        if (style.bottom > bottom) bottom = style.bottom;
                    })
                } else {
                    style = getComponentRotatedStyle(component.style);
                }

                if (style.left < left) left = style.left
                if (style.top < top) top = style.top
                if (style.right > right) right = style.right
                if (style.bottom > bottom) bottom = style.bottom
            })

            this.start.x = left
            this.start.y = top
            this.width = right - left
            this.height = bottom - top

            // 设置选中区域位移大小信息和区域内的组件数据
            this.$store.commit('EditPage/setAreaData', {
                style: {
                    left,
                    top,
                    width: this.width,
                    height: this.height,
                },
                components: areaData,
            })
        },

        getSelectArea() {
            const result = []
            // 区域起点坐标
            const { x, y } = this.start
            // 计算所有的组件数据，判断是否在选中区域内
            this.componentData.forEach(component => {
                if (component.isLock) return

                const { left, top, width, height } = getComponentRotatedStyle(component.style)
                if (x <= left && y <= top && (left + width <= x + this.width) && (top + height <= y + this.height)) {
                    result.push(component)
                }
            })

            // 返回在选中区域内的所有组件
            return result
        },

        handleContextMenu(e) {
            e.stopPropagation()
            // 默认样式
            e.preventDefault()

            // 计算菜单相对于编辑器的位移
            let target = e.target
            let top = e.offsetY
            let left = e.offsetX
            while (target instanceof SVGElement) {
                target = target.parentNode
            }

            while (!target.className.includes('editor')) {
                left += target.offsetLeft
                top += target.offsetTop
                target = target.parentNode
            }

            this.$store.commit('EditPage/showContextMenu', { top, left })
        },

        getComponentStyle(style) {
            return getStyle(style, this.svgFilterAttrs)
        },

        getSVGStyle(style) {
            return getSVGStyle(style, this.svgFilterAttrs)
        },

    },
}
</script>

<style lang="less" scoped>
.editor {
    position: relative;
    background: #fff;
    // margin: auto;
    top:0;
    left:0;

    .lock {
        opacity: .5;

        &:hover {
            cursor: not-allowed;
        }
    }
}

.edit {
    .component {
        outline: none;
        width: 100%;
        height: 100%;
    }
}
</style>
