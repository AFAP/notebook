# 通过Intent进行分享时，如何按照需求进行分享应用的过滤

一般在做分享时，我们都会集成各个社交平台的SDK，这个方式比较繁琐，如果没有特别要求，只希望将信息分享出去，其实我们可以用Intent来做这个事情。但是，通过简单的设置，我们会发现，系统弹出很多种方式，包括邮件、短信之类的，如果我们要按照实际需求过滤出可显示的应用，可按照以下办法：

```java
String title = "我是分享内容的标题";
String text = "我是分享出去的内容，通常是一个http开头的链接";
String imgpath = "/storage/emulated/0/Download/20151223002857.jpg";

String type = "image/*";// "text/plain"
Intent shareIntent;

shareIntent = new Intent(android.content.Intent.ACTION_SEND);
shareIntent.setType(type);
shareIntent.putExtra(Intent.EXTRA_SUBJECT, title);
shareIntent.putExtra(Intent.EXTRA_TEXT, text);
shareIntent.putExtra(Intent.EXTRA_STREAM, Uri.fromFile(new File(imgpath)));

PackageManager pm = getPackageManager();
// 根据当前Intent的设定，获取设备上支持此分享的应用集合
List<ResolveInfo> resInfo = pm.queryIntentActivities(shareIntent, 0);
List<LabeledIntent> intentList = new ArrayList<LabeledIntent>();
for (int i = 0; i < resInfo.size(); i++) {
	ResolveInfo ri = resInfo.get(i);
	String packageName = ri.activityInfo.packageName;

	// 这里可以根据实际需要进行过滤
	if (packageName.contains("twitter") || packageName.contains("facebook") || packageName.contains("mobileqq")
			|| packageName.contains("tencent.mm") || packageName.contains("tencent.pb")) {
		Intent intent = new Intent();
		intent.setComponent(new ComponentName(packageName, ri.activityInfo.name));
		intent.setAction(Intent.ACTION_SEND);
		intent.setType(type);
		intent.putExtra(Intent.EXTRA_SUBJECT, title);
		intent.putExtra(Intent.EXTRA_TEXT, text);
		intent.putExtra(Intent.EXTRA_STREAM, Uri.fromFile(new File(imgpath)));

		intentList.add(new LabeledIntent(intent, packageName, ri.loadLabel(pm), ri.icon));
	}
}

// 注意，这里用的remove，为的是避免第一个分享方式重复，因为后面设置了额外的方式
Intent openInChooser = Intent.createChooser(intentList.remove(0), "请选择您要分享的方式");
LabeledIntent[] extraIntents = intentList.toArray(new LabeledIntent[intentList.size()]);
openInChooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, extraIntents);

 startActivity(openInChooser);
```

**以上，这是刚遇到的一个问题，记录于此。*