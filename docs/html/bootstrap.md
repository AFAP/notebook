## 1.Navbars中点击展开下拉调整为悬停展开下拉

* 去除`data-bs-toggle="dropdown"`
* 样式增加
```css
.dropdown:hover .dropdown-menu {
  display: block;
}
```