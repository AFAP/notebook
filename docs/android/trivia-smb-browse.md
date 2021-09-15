# 【Android 冷知识】利用SMB协议远程查看电脑文件或者其他存储设备

## 1.说明
为什么说是冷知识，因为大多数项目用不到，所以归类为冷知识。
本文主要介绍如何通过手机来浏览同局域网内电脑上的文件或者同局域网内其他存储设备上的文件（存储设备有SMBA服务）。


# 2.用到的资源：
[JCIFS项目](https://jcifs.samba.org)


[SMB错误码](https://msdn.microsoft.com/en-us/library/ee441884.aspx)


## 3.简单使用
### a.去官网下载最新的"jcifs-1.3.18.jar"并引入项目中去。
### b.在自己的Application onCreate中设置基础配置
```java
System.setProperty("jcifs.smb.client.dfs.disabled", "true");
System.setProperty("jcifs.smb.client.soTimeout", "1000000");
System.setProperty("jcifs.smb.client.responseTimeout", "30000");
```

* jcifs.smb.client.dfs.disabled 这个属性一定记得设置true，其默认值是false，不然连接会非常非常的慢。jcifs.smb.client.dfs.soTimeout、jcifs.smb.client.responseTimeout 这两个属性可以设的稍微大点，避免网络不稳定带来的连接中断。

### c.登录鉴权(针对电脑设置了密码的情况)
```java
String ip = "192.168.1.100";
String username = "AFAP";
String password = "123456";

UniAddress mDomain = UniAddress.getByName(ip);
NtlmPasswordAuthentication mAuthentication = new NtlmPasswordAuthentication(ip, username, password);
SmbSession.logon(mDomain, mAuthentication);
```
*至此，就完成了鉴权，接下来可以浏览电脑里的文件了。当然，实际过程你会遇到各种异常，请根据日志解决。

### d.浏览各磁盘下文件夹与文件
```java
// 获取跟目录然后获取下面各个盘符
String rootPath = "smb://" + ip + "/";
SmbFile mRootFolder;
// 匿名登录即无需登录
if (mSpu.isAnonymous()) {
    mRootFolder = new SmbFile(rootPath);
} else {
    mRootFolder = new SmbFile(rootPath, mAuthentication);
}

try {
    SmbFile[] files;
    files = mRootFolder.listFiles();
    for (SmbFile smbfile : files) {
        mAdapterList.add(smbfile);
    }
} catch (SmbException e) {
    // ...
}
```

后面就是根据得到的文件进行展示或者其他操作了，比如复制、改名、上传等。

## 4.注意点
- 被访问目标需要关闭防火墙；
- 加载远程文件列表等操作都是网络操作，不能在UI线程进行。

## 其他相关
手机端直接在线播放远程视频文件(SMB转Http协议): [点我直达](./trivia-smb-http)