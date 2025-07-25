module.exports = {
  title: '阿富的笔记本',
  description: 'AI Android miniprogram 小程序 Html Css Javascript',
  base: "/",
  head: [
    ['link', { rel: 'icon', href: '/forth.png' }]
  ],
  themeConfig: {
    logo: '/bigHero.png',
    search: false,
    sidebar: [
      {
        title: 'AI',   // 必要的
        collapsable: false, // 可选的, 默认值是 true,
        sidebarDepth: 0,    // 可选的, 默认值是 1
        children: [
          {
            title: 'AI开发',
            path: '/ai/note',
          },
          {
            title: '伪智能体',
            path: '/ai/fake-agent',
          },
        ]
      },
      {
        title: 'Android',   // 必要的
        collapsable: false, // 可选的, 默认值是 true,
        sidebarDepth: 0,    // 可选的, 默认值是 1
        children: [
          {
            title: 'Android开发(持续更新)',
            path: '/android/note',
          },
          {
            title: '视频播放（基于ijkplayer）',
            path: '/android/player-ijkplayer',
          },
          {
            title: 'Intent分享，按需要过滤',
            path: '/android/intent-share-filter',
          },
          {
            title: 'Intent打开Youtube并带入搜索关键字',
            path: '/android/intent-open-youtube',
          },
          {
            title: 'OkHttp3.0+Retrofit2实现自动重新登录',
            path: '/android/rxjava-retrofit-autoauth',
          },
          {
            title: '蓝牙「防丢器」(BLE)的简单实现',
            sidebarDepth: 0,
            children: [
              {
                title: '（一）扫描并识别设备',
                path: '/android/ble-tether-1',
                children: []
              },
              {
                title: '（二）连接设备并检测连接状态',
                path: '/android/ble-tether-2',
              },
              {
                title: '（三）手机与设备之间指令传输',
                path: '/android/ble-tether-3',
              }
            ]
          },
          {
            title: 'Android冷知识',
            sidebarDepth: 0,
            children: [
              {
                title: 'SMB浏览远程文件夹',
                path: '/android/trivia-smb-browse',
              },
              {
                title: 'SMB转Http协议',
                path: '/android/trivia-smb-http',
              },
            ]
          },
        ]
      },
      {
        title: '微信小程序',
        collapsable: false,
        sidebarDepth: 0,
        children: [
          {
            title: '小程序开发(持续更新)',
            path: '/miniprogram/note',
          },
          {
            title: '页面添加水印，防止截图',
            path: '/miniprogram/watermark',
          },
          {
            title: '小程序插件-手写签名',
            path: '/miniprogram/plugins-handwriting',
          },
          {
            title: '小程序插件-日历',
            path: '/miniprogram/plugins-calendar',
          },
          {
            title: '小程序蓝牙开发相关注意点',
            path: '/miniprogram/bluetooth-tips',
          },

        ]
      },
      {
        title: 'Html相关',   // 必要的
        collapsable: false,
        sidebarDepth: 0,
        children: [
          {
            title: '选项菜单自动换行',
            path: '/html/search-options-auto-fold',
          },
          {
            title: 'VUE中基于elementUI实现全局的图片预览',
            path: '/html/vue-picture-preview-base-elementui',
          },
          {
            title: '使用xlsx-js-style实现sheetjs的导出样式设置',
            path: '/html/vue-xlsx-js-style',
          },
          {
            title: 'CSS实现的Loading样式',
            path: '/html/loading-css',
          },
          {
            title: 'Bootstrap V5相关',
            path: '/html/bootstrap',
          },
        ]
      },
      {
        title: '其他',   // 必要的
        collapsable: false,
        sidebarDepth: 0,
        children: [
          {
            title: '服务器环境',
            path: '/other/info',
          },
          {
            title: 'Jenkins使用示例',
            path: '/other/jenkins',
          }
        ]
      },
    ],
    displayAllHeaders: true // 默认值：false
  },
  markdown: {
    lineNumbers: true
  }
}