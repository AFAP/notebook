# Android开发(持续更新)



## 1.使用Fresco时，根据图片url获取缓存文件
```java
String imgUrl = "xxx";
ImageRequest imageRequest = ImageRequestBuilder
        .newBuilderWithSource(Uri.parse(imgUrl))
        .build();
CacheKey cacheKey = DefaultCacheKeyFactory
        .getInstance()
        .getEncodedCacheKey(imageRequest, Uri.parse(imgUrl));
BinaryResource bRes = ImagePipelineFactory
        .getInstance()
        .getMainFileCache()
        .getResource(cacheKey);
File file = ((FileBinaryResource) bRes).getFile();
```



## 2.使用Fresco时，如何实现缩放效果（[PhotoView](https://github.com/chrisbanes/PhotoView)），且配合ViewPager使用

* 2.1浏览图片的页面布局文件：
```xml
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/black"
    android:fitsSystemWindows="true">
<android.support.v4.view.ViewPager
    android:id="@id/viewpager"
    android:layout_width="match_parent"
    android:layout_height="match_parent" />
</RelativeLayout>
```
  
* 2.2Activity页面，这里只摘最关键部分（直接参考**[PhotoDraweeView](https://github.com/ongakuer/PhotoDraweeView)**即可）
  记得引入库：compile 'me.relex:photodraweeview:1.1.2'
```java
public class MyPagerAdapter extends PagerAdapter {
    public MyPagerAdapter() {

    }

    @Override
    public void destroyItem(ViewGroup container, int position, Object object) {
        container.removeView((View) object);
    }

    @Override
    public Object instantiateItem(ViewGroup view, int position) {
        final PhotoDraweeView photoDraweeView = new PhotoDraweeView(view.getContext());
        PipelineDraweeControllerBuilder controller = Fresco.newDraweeControllerBuilder();
        controller.setUri(Uri.parse(mPics.get(position)));
        controller.setOldController(photoDraweeView.getController());
        controller.setControllerListener(new BaseControllerListener<ImageInfo>() {
            @Override
            public void onFinalImageSet(String id, ImageInfo imageInfo, Animatable animatable) {
                super.onFinalImageSet(id, imageInfo, animatable);
                if (imageInfo == null) {
                    return;
                }
                photoDraweeView.update(imageInfo.getWidth(), imageInfo.getHeight());
            }
        });
        photoDraweeView.setController(controller.build());

        try {
            view.addView(photoDraweeView, ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT);
        } catch (Exception e) {
            e.printStackTrace();
        }

        return photoDraweeView;
    }

    @Override
    public int getCount() {
        return mPics.size();
    }

    @Override
    public boolean isViewFromObject(View view, Object object) {
        return view.equals(object);
    }

    @Override
    public void restoreState(Parcelable state, ClassLoader loader) {
    }

    @Override
    public Parcelable saveState() {
        return null;
    }
}
```



## 3.保存图片后，在系统图库能查看到

```java
// 获取拍摄完的图片文件
File file = getCameraController().getOutputFile();
try {
    MediaStore.Images.Media.insertImage(getContentResolver(),
            file.getAbsolutePath(), file.getName(), null);
    // 通知图库更新
    context.sendBroadcast(new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE,
            Uri.parse("file://" + file.getAbsolutePath())));
} catch (FileNotFoundException e) {
    e.printStackTrace();
}
```



## 4.跳转到应用自己的设置页面（针对request权限时被忽略情况）

```java
Intent localIntent = new Intent();
localIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
if (Build.VERSION.SDK_INT >= 9) {
    localIntent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
    localIntent.setData(Uri.fromParts("package", getPackageName(), null));
} else if (Build.VERSION.SDK_INT <= 8) {
    localIntent.setAction(Intent.ACTION_VIEW);
    localIntent.setClassName("com.android.settings", "com.android.settings.InstalledAppDetails");
    localIntent.putExtra("com.android.settings.ApplicationPkgName", getPackageName());
}
startActivity(localIntent);
```



## 5.获取在线视频封面（第一帧图像）

```java
public static Bitmap getVideoBitmap(String url) {
	Bitmap bitmap = null;
	//MediaMetadataRetriever 是android中定义好的一个类，提供了统一的接口，用于从输入的媒体文件中取得帧和元数据；
	MediaMetadataRetriever retriever = new MediaMetadataRetriever();
	try {
		//根据文件路径获取缩略图
		retriever.setDataSource(url, new HashMap<String, String>());
		//获得第一帧图片
		bitmap = retriever.getFrameAtTime(0, MediaMetadataRetriever.OPTION_NEXT_SYNC);
	} catch (IllegalArgumentException e) {
		e.printStackTrace();
	} finally {
		retriever.release();
	}
	return bitmap;
}
```


## 6.Android Studio 中多个module统一support版本

在build.gradle中加入如下代码：
```js
configurations.all {
    resolutionStrategy.eachDependency { DependencyResolveDetails details ->
        def requested = details.requested
        if (requested.group == 'com.android.support') {
            if (!requested.name.startsWith("multidex")) {
                details.useVersion '25.4.0'
            }
        }
    }
}
```



## 7.通过代码暂停系统闹钟

```java
startActivity(new Intent(AlarmClock.ACTION_SNOOZE_ALARM));
// 一般能查到的需要的系统权限就是这个，但是并不是
<uses-permission android:name="android.permission.SET_ALARM"/>
// 值钱的东西来了，必须加上这一行，包括代码设置代码也是同理
<uses-permission android:name="com.android.alarm.permission.SET_ALARM"/>
```



## 8.关于SearchView默认展开搜索框的设置

```java
/*------------------ SearchView有三种默认展开搜索框的设置方式，区别如下： ------------------*/
//设置搜索框直接展开显示。左侧有放大镜(在搜索框中) 右侧有叉叉 可以关闭搜索框
mSearchView.setIconified(false);
//设置搜索框直接展开显示。左侧有放大镜(在搜索框外) 右侧无叉叉 有输入内容后有叉叉 不能关闭搜索框
mSearchView.setIconifiedByDefault(false);
//设置搜索框直接展开显示。左侧有无放大镜(在搜索框中) 右侧无叉叉 有输入内容后有叉叉 不能关闭搜索框
mSearchView.onActionViewExpanded();
```
参考见：https://juejin.im/post/591e5e528d6d810058b684c3



## 9.PendingIntent 传递参数后获取为null的几种解决路子

android通知栏点击并进入相应页面，同时传递参数，可通过intent.putExtra方法传递参数，但是有很多情况会导致进入Activity后获取不到参数，始终是null。
`PendingIntent getActivity(Context context, int requestCode, Intent intent, int flags) `

可尝试一下几个方法（综合搜集）：

* 1.flags使用PendingIntent.FLAG_UPDATE_CURRENT
* 2.requestCode尝试使用大于0的数字，且可以考虑每次都是不一样的数字
* 3.intent可先setAction试试
* 4.试试下面的setFlags代码
 `intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
 `

* **5.PendingIntent会丢失Parcelable类型的参数！！！避免使用**



