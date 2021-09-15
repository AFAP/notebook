(window.webpackJsonp=window.webpackJsonp||[]).push([[9],{370:function(t,s,n){t.exports=n.p+"assets/img/1.650b470c.png"},371:function(t,s,n){t.exports=n.p+"assets/img/2.2472ab0d.png"},396:function(t,s,n){"use strict";n.r(s);var a=n(45),e=Object(a.a)({},(function(){var t=this,s=t.$createElement,a=t._self._c||s;return a("ContentSlotsDistributor",{attrs:{"slot-key":t.$parent.slotKey}},[a("h1",{attrs:{id:"intent打开youtube并带入搜索关键字"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#intent打开youtube并带入搜索关键字"}},[t._v("#")]),t._v(" Intent打开Youtube并带入搜索关键字")]),t._v(" "),a("p",[t._v("想要app内直接打开youtube并带入搜索的关键字，由于网上没有搜到解决方案，故解决后记录一下，也可以给其他人参考。效果如下(直接打开Youtube并搜索VR关键字视频)：")]),t._v(" "),a("p",[a("img",{attrs:{src:n(370),alt:"搜索结果"}})]),t._v(" "),a("p",[t._v("网上能搜到的都是这种写法：\n"),a("code",[t._v('Intent appIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("vnd.youtube:" + id));')]),t._v('\n其中id为频道id，与我的需求不符合，我并不知道频道id，只晓得目标关键字，所以只能继续探索。在youtube的网站上直接搜索关键字"VR"，浏览器的地址为："https://www.youtube.com/results?search_query=vr",所以我改了方式，直接：\n'),a("code",[t._v('intent = new Intent(Intent.ACTION_VIEW); intent.setData(Uri.parse("https://www.youtube.com/results?search_query=vr"));')]),t._v("\n这种方式呢，在调用时，系统会弹出让用户选择应用，能被选择的应用有浏览器（系统自带及自己安装的）、youtube等其他应用，我这里需要指定应用，故继续摸索。在解压youtube.apk后，查看其主配置文件，会发现如下一段：\n"),a("img",{attrs:{src:n(371),alt:"youtube主配置文件"}})]),t._v(" "),a("p",[t._v("So,搞定，Youtube确实有一个UrlActivity可用来解析加载http,https,vnd.youtube等，所以最后写法：")]),t._v(" "),a("div",{staticClass:"language-java line-numbers-mode"},[a("pre",{pre:!0,attrs:{class:"language-java"}},[a("code",[t._v("intent "),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("new")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("Intent")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),a("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("Intent")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("ACTION_VIEW"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\nintent"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),a("span",{pre:!0,attrs:{class:"token function"}},[t._v("setData")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),a("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("Uri")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),a("span",{pre:!0,attrs:{class:"token function"}},[t._v("parse")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),a("span",{pre:!0,attrs:{class:"token string"}},[t._v('"https://www.youtube.com/results?search_query=vr"')]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\nintent"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),a("span",{pre:!0,attrs:{class:"token function"}},[t._v("setClassName")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),a("span",{pre:!0,attrs:{class:"token string"}},[t._v('"com.google.android.youtube"')]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),a("span",{pre:!0,attrs:{class:"token string"}},[t._v('"com.google.android.youtube.UrlActivity"')]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n"),a("span",{pre:!0,attrs:{class:"token function"}},[t._v("startActivity")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("intent"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n")])]),t._v(" "),a("div",{staticClass:"line-numbers-wrapper"},[a("span",{staticClass:"line-number"},[t._v("1")]),a("br"),a("span",{staticClass:"line-number"},[t._v("2")]),a("br"),a("span",{staticClass:"line-number"},[t._v("3")]),a("br"),a("span",{staticClass:"line-number"},[t._v("4")]),a("br")])]),a("p",[a("strong",[t._v("Over")])])])}),[],!1,null,null,null);s.default=e.exports}}]);