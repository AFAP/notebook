此方式不需要在特定页面内加入组件代码，通过调用公共API方法即可，公共预览方法内，会进行预览组件的动态加载（追加至body节点）

* 1.在main.js中引入ElImageViewer，此组件默认不对外暴露，是image组件中使用的一个功能：

  ```js
  import ElImageViewer from "element-ui/packages/image/src/image-viewer";
  ```

* 2.在预览的公共方法中：

  ```js
  let ElImageViewer = Vue.extend({
    template: '<el-image-viewer v-if="elImageViewerVisible" :on-close="() => {elImageViewerVisible = false}" :url-list="elImageViewerList" />',
    data: function () {
      return {
        elImageViewerVisible: true,
        elImageViewerList: [url]
      }
    }
  })
  let component = new ElImageViewer().$mount()
  document.body.appendChild(component.$el)
  ```