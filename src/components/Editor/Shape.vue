<template>
    <div class="shape" :class="{ active }" @click="selectCurComponent" @mousedown="handleMouseDownOnShape">
        <span v-show="isActive()" class="iconfont icon-xuanzhuan" @mousedown="handleRotate"></span>
        <span v-show="element.isLock" class="iconfont icon-suo"></span>
        <div v-for="item in (isActive() ? getPointList() : [])" :key="item" class="shape-point"
            :style="getPointStyle(item)" @mousedown="handleMouseDownOnPoint(item, $event)">
        </div>
        <slot></slot>
    </div>
</template>

<script>
import eventBus from '@/utils/eventBus'
import runAnimation from '@/utils/runAnimation'
import { mapState } from 'vuex'
import calculateComponentPositonAndSize from '@/utils/calculateComponentPositonAndSize'
import { mod360 } from '@/utils/translate'
import { isPreventDrop } from '@/utils/utils'

export default {
    props: {
        active: {
            type: Boolean,
            default: false,
        },
        element: {
            require: true,
            type: Object,
            default: () => { },
        },
        defaultStyle: {
            require: true,
            type: Object,
            default: () => { },
        },
        index: {
            require: true,
            type: [Number, String],
            default: 0,
        },
    },
    data() {
        return {
            pointList: ['lt', 't', 'rt', 'r', 'rb', 'b', 'lb', 'l'], // 八个方向
            pointList2: ['r', 'l'], // 左右两个方向
            initialAngle: { // 每个点对应的初始角度
                lt: 0,
                t: 45,
                rt: 90,
                r: 135,
                rb: 180,
                b: 225,
                lb: 270,
                l: 315,
            },
            angleToCursor: [ // 每个范围的角度对应的光标
                { start: 338, end: 23, cursor: 'nw' },
                { start: 23, end: 68, cursor: 'n' },
                { start: 68, end: 113, cursor: 'ne' },
                { start: 113, end: 158, cursor: 'e' },
                { start: 158, end: 203, cursor: 'se' },
                { start: 203, end: 248, cursor: 's' },
                { start: 248, end: 293, cursor: 'sw' },
                { start: 293, end: 338, cursor: 'w' },
            ],
            cursors: {},
        }
    },
    computed: mapState('EditPage', [
        'curComponent',
        'editor',
    ]),
    mounted() {
        // 用于 Group 组件
        if (this.curComponent) {
            this.cursors = this.getCursor() // 根据旋转角度获取光标位置
        }
        eventBus.$on('runAnimation', () => {
            if (this.element == this.curComponent) {
                runAnimation(this.$el, this.curComponent.animations)
            }
        })
        eventBus.$on('stopAnimation', () => {
            this.$el.classList.remove('animated', 'infinite')
        })
    },
    methods: {
        getPointList() {
            return this.element.component === 'line-shape' ? this.pointList2 : this.pointList
        },

        isActive() {
            return this.active && !this.element.isLock
        },

        // 处理旋转
        handleRotate(e) {
            this.$store.commit('EditPage/setClickComponentStatus', true)
            e.preventDefault();
            e.stopPropagation();
            // 初始坐标和初始角度
            const pos = { ...this.defaultStyle }
            const startY = e.clientY;
            const startX = e.clientX;
            const startRotate = pos.rotate;

            // 获取元素中心点位置
            const rect = this.$el.getBoundingClientRect();//返回元素的大小及其相对于视口的位置
            // console.log("this.$el", this.$el);//shape盒子
            // console.log("rect ", rect);
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // 旋转前的角度:
            /*
                double atan2(double y,double x) 返回的是原点至点(x,y)的方位角，即与 x 轴的夹角。返回值的单位为弧度，取值范围为（-π, π]。
                结果为正表示从 X 轴逆时针旋转的角度，结果为负表示从 X 轴顺时针旋转的角度。若要用度表示反正切值，请将结果再乘以 180/π。
                另外要注意的是，函数atan2(y,x)中参数的顺序是倒置的，atan2(y,x)计算的值相当于点(x,y)的角度值。
            */
            const rotateDegreeBefore = Math.atan2(startY - centerY, startX - centerX) / (Math.PI / 180)

            // 如果元素没有移动，则不保存快照
            let hasMove = false
            const move = (moveEvent) => {
                hasMove = true
                const curX = moveEvent.clientX
                const curY = moveEvent.clientY
                // 旋转后的角度
                const rotateDegreeAfter = Math.atan2(curY - centerY, curX - centerX) / (Math.PI / 180)
                // 获取旋转的角度值
                pos.rotate = startRotate + rotateDegreeAfter - rotateDegreeBefore
                // 修改当前组件样式
                this.$store.commit('EditPage/setShapeStyle', pos)
            }

            const up = () => {
                hasMove && this.$store.commit('EditPage/recordSnapshot')
                document.removeEventListener('mousemove', move)
                document.removeEventListener('mouseup', up)
                this.cursors = this.getCursor(); // 根据旋转角度获取光标位置
            }

            document.addEventListener('mousemove', move)
            document.addEventListener('mouseup', up)
        },
        // 计算小圆点位置
        getPointStyle(point) {
            const { width, height } = this.defaultStyle
            const hasT = /t/.test(point)
            const hasB = /b/.test(point)
            const hasL = /l/.test(point)
            const hasR = /r/.test(point)
            let newLeft = 0
            let newTop = 0

            // 四个角的点
            if (point.length === 2) {
                newLeft = hasL ? 0 : width
                newTop = hasT ? 0 : height
            } else {
                // 上下两点的点，宽度居中
                if (hasT || hasB) {
                    newLeft = width / 2
                    newTop = hasT ? 0 : height
                }

                // 左右两边的点，高度居中
                if (hasL || hasR) {
                    newLeft = hasL ? 0 : width
                    newTop = Math.floor(height / 2)
                }
            }

            const style = {
                marginLeft: '-4px',
                marginTop: '-4px',
                left: `${newLeft}px`,
                top: `${newTop}px`,
                cursor: this.cursors[point],
            }

            return style
        },

        getCursor() {
            const { angleToCursor, initialAngle, pointList, curComponent } = this;
            const rotate = mod360(curComponent.style.rotate);// 取余 360
            const result = {};
            let lastMatchIndex = -1;// 从上一个命中的角度的索引开始匹配下一个，降低时间复杂度

            pointList.forEach(point => {
                const angle = mod360(initialAngle[point] + rotate);//lt
                const len = angleToCursor.length;//8
                let flag = true;
                while (flag) {
                    lastMatchIndex = (lastMatchIndex + 1) % len;//0
                    const angleLimit = angleToCursor[lastMatchIndex];//nw
                    if (angle < 23 || angle >= 338) {
                        result[point] = 'nw-resize';
                        return;
                    }

                    if (angleLimit.start <= angle && angle < angleLimit.end) {
                        result[point] = angleLimit.cursor + '-resize'
                        return;
                    }
                }
            })

            return result;
        },
        /*
        点击小圆点时，可以进行放大缩小操作
            1. 点击小圆点时，记录点击的坐标 xy。
            2. 假设我们现在向下拖动，那么 y 坐标就会增大。
            3. 用新的 y 坐标减去原来的 y 坐标，就可以知道在纵轴方向的移动距离是多少。
            4. 最后再将移动距离加上原来组件的高度，就可以得出新的组件高度。
            5. 如果是正数，说明是往下拉，组件的高度在增加。如果是负数，说明是往上拉，组件的高度在减少。
        */
        handleMouseDownOnShape(e) {
            this.$store.commit('EditPage/setInEditorStatus', true); // 传值让复制粘贴这些功能生效
            this.$store.commit('EditPage/setClickComponentStatus', true);//传值表示点击画布时选中组件
            if (isPreventDrop(this.element.component)) {//不是svg或文本/圆形/矩形的关闭默认行为
                e.preventDefault();
            }

            e.stopPropagation();
            this.$store.commit('EditPage/setCurComponent', { component: this.element, index: this.index })
            if (this.element.isLock) return;

            this.cursors = this.getCursor(); // 根据旋转角度获取光标位置

            const pos = { ...this.defaultStyle };
            const startY = e.clientY;//鼠标坐标到页面顶部的距离
            const startX = e.clientX;
            // 如果直接修改属性，值的类型会变为字符串，所以要转为数值型
            const startTop = Number(pos.top);
            const startLeft = Number(pos.left);

            // 如果元素没有移动，则不保存快照
            let hasMove = false;
            const move = (moveEvent) => {
                hasMove = true;
                const curX = moveEvent.clientX;
                const curY = moveEvent.clientY;
                pos.top = curY - startY + startTop;
                pos.left = curX - startX + startLeft;

                // 修改当前组件样式
                this.$store.commit('EditPage/setShapeStyle', pos)
                // 等更新完当前组件的样式并绘制到屏幕后再判断是否需要吸附
                // 如果不使用 $nextTick，吸附后将无法移动
                this.$nextTick(() => {
                    // 触发元素移动事件，用于显示标线、吸附功能
                    // 后面两个参数代表鼠标移动方向
                    // curY - startY > 0 true 表示向下移动 false 表示向上移动
                    // curX - startX > 0 true 表示向右移动 false 表示向左移动
                    eventBus.$emit('move', curY - startY > 0, curX - startX > 0)
                })
            }

            const up = () => {
                hasMove && this.$store.commit('EditPage/recordSnapshot')
                // 触发元素停止移动事件，用于隐藏标线
                eventBus.$emit('unmove');
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', up);
            }

            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);
        },

        selectCurComponent(e) {
            // 阻止向父组件冒泡
            e.stopPropagation()
            e.preventDefault()
            this.$store.commit('EditPage/hideContextMenu')
        },

        handleMouseDownOnPoint(point, e) {
            this.$store.commit('EditPage/setInEditorStatus', true)
            this.$store.commit('EditPage/setClickComponentStatus', true)
            e.stopPropagation()
            e.preventDefault()

            const style = { ...this.defaultStyle }
            // console.log(style)
            // 组件宽高比
            const proportion = style.width / style.height;

            // 组件中心点
            const center = {
                x: style.left + style.width / 2,
                y: style.top + style.height / 2,
            }

            // 获取画布位移信息
            const editorRectInfo = this.editor.getBoundingClientRect();
          console.log(e.target)
            // 获取 point 与实际拖动基准点的差值 @justJokee
            // fix https://github.com/woai3c/visual-drag-demo/issues/26#issue-937686285
            const pointRect = e.target.getBoundingClientRect();
          // console.log(pointRect)
            // 当前点击圆点相对于画布的中心坐标
            const curPoint = {
                x: Math.round(pointRect.left - editorRectInfo.left + e.target.offsetWidth / 2),
                y: Math.round(pointRect.top - editorRectInfo.top + e.target.offsetHeight / 2),
            }

            // 获取对称点的坐标
            const symmetricPoint = {
                x: center.x - (curPoint.x - center.x),
                y: center.y - (curPoint.y - center.y),
            }

            // 是否需要保存快照
            let needSave = false;
            let isFirst = true;

            const needLockProportion = this.isNeedLockProportion();
            const move = (moveEvent) => {
                // 第一次点击时也会触发 move，所以会有“刚点击组件但未移动，组件的大小却改变了”的情况发生
                // 因此第一次点击时不触发 move 事件
                if (isFirst) {
                    isFirst = false;
                    return;
                }

                needSave = true;
                const curPositon = {
                    x: moveEvent.clientX - Math.round(editorRectInfo.left),
                    y: moveEvent.clientY - Math.round(editorRectInfo.top),
                }

                calculateComponentPositonAndSize(point, style, curPositon, proportion, needLockProportion, {
                    center,
                    curPoint,
                    symmetricPoint,
                })

                this.$store.commit('EditPage/setShapeStyle', style)

            }

            const up = () => {
                document.removeEventListener('mousemove', move)
                document.removeEventListener('mouseup', up)
                needSave && this.$store.commit('EditPage/recordSnapshot')
            }

            document.addEventListener('mousemove', move)
            document.addEventListener('mouseup', up)
        },

        isNeedLockProportion() {
            if (this.element.component != 'Group') return false
            const ratates = [0, 90, 180, 360]
            for (const component of this.element.propValue) {
                if (!ratates.includes(mod360(parseInt(component.style.rotate)))) {
                    return true
                }
            }

            return false
        },
    },
}
</script>

<style lang="less" scoped>
.shape {
    position: absolute;

    &:hover {
        cursor: move;
    }
}

.active {
    outline: 1px solid #5176ab;
    user-select: none;
}

.shape-point {
    position: absolute;
    background: #fff;
    border: 1px solid #5176ab;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    z-index: 1;
}

.icon-xuanzhuan {
    position: absolute;
    top: -34px;
    left: 50%;
    transform: translateX(-50%);
    cursor: grab;
    color: #5176ab;
    font-size: 20px;
    font-weight: 600;

    &:active {
        cursor: grabbing;
    }
}

.icon-suo {
    position: absolute;
    top: 0;
    right: 0;
}
</style>
