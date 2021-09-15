# 【Android 冷知识】SMB协议转Http，实现视频在线播放

## 1.说明
为什么说是冷知识，因为大多数项目用不到，所以归类为冷知识。
本文主要介绍如何将SMB协议转换为常见的HTTP协议，以便利用各种播放器实现在线播放。本文与前篇《[利用SMB协议远程查看电脑文件或者其他存储设备](./trivia-smb-browse)》存在关联。

## 2.用到的资源：
cybergarage.jar(具体地址找不到了，自己搜搜看看吧)

## 3.核心代码
`PlayFileService.java`,需要在主配置文件中注册，并在应用启动或者需要转换的时候开启改服务。

```java
package com.powerstick.service;

import org.cybergarage.http.HTTPServerList;
import android.app.Service;
import android.content.Intent;
import android.os.IBinder;

public class PlayFileService extends Service {

    private FileServer fileServer = null;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        fileServer = new FileServer();
        fileServer.start();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();

        HTTPServerList httpServerList = fileServer.getHttpServerList();
        httpServerList.stop();
        httpServerList.close();
        httpServerList.clear();
        fileServer.interrupt();

    }
}
```

`FileServer.java`,需要在转换服务中启动该线程。

```java
package com.powerstick.service;

import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.net.MalformedURLException;
import java.net.URLDecoder;
import jcifs.smb.SmbException;
import jcifs.smb.SmbFile;
import org.cybergarage.http.HTTPRequest;
import org.cybergarage.http.HTTPRequestListener;
import org.cybergarage.http.HTTPResponse;
import org.cybergarage.http.HTTPServerList;
import org.cybergarage.http.HTTPStatus;

import com.powerstick.BaseApplication;
import com.powerstick.utils.FileUtils;

public class FileServer extends Thread implements HTTPRequestListener {

    public static final String CONTENT_EXPORT_URI = "/smb";
    private HTTPServerList httpServerList = new HTTPServerList();
    // 默认的共享端口
    private int HTTPPort = 2222;
    // 绑定的ip
    private String bindIP = null;

    public String getBindIP() {
        return bindIP;
    }

    public void setBindIP(String bindIP) {
        this.bindIP = bindIP;
    }

    public HTTPServerList getHttpServerList() {
        return httpServerList;
    }

    public void setHttpServerList(HTTPServerList httpServerList) {
        this.httpServerList = httpServerList;
    }

    public int getHTTPPort() {
        return HTTPPort;
    }

    public void setHTTPPort(int hTTPPort) {
        HTTPPort = hTTPPort;
    }

    @Override
    public void run() {
        super.run();

        /**************************************************
         * 
         * 创建http服务器，接收共享请求
         * 
         *************************************************/
        // 重试次数
        int retryCnt = 0;
        // 获取端口 2222
        int bindPort = getHTTPPort();

        HTTPServerList hsl = getHttpServerList();
        while (hsl.open(bindPort) == false) {
            retryCnt++;
            // 重试次数大于服务器重试次数时返回
            if (100 < retryCnt) {
                return;
            }
            setHTTPPort(bindPort + 1);
            bindPort = getHTTPPort();
        }
        // 给集合中的每个HTTPServer对象添加HTTPRequestListener对象
        hsl.addRequestListener(this);
        // 调用集合中所有HTTPServer的start方法
        hsl.start();

        FileUtils.ip = hsl.getHTTPServer(0).getBindAddress();
        FileUtils.port = hsl.getHTTPServer(0).getBindPort();

    }

    @Override
    public void httpRequestRecieved(HTTPRequest httpReq) {

        String uri = httpReq.getURI();
        System.out.println("uri*****" + uri);

        if (uri.startsWith(CONTENT_EXPORT_URI) == false) {
            httpReq.returnBadRequest();
            return;
        }
        try {
            uri = URLDecoder.decode(uri, "UTF-8");
        } catch (UnsupportedEncodingException e1) {
            e1.printStackTrace();
        }
        System.out.println("uri=====" + uri);
        if (uri.length() < 6) {
            return;
        }
        // 截取文件的信息
        String filePaths = "smb://" + uri.substring(5);

        System.out.println("filePaths=" + filePaths);
        // 判断uri中是否包含参数
        int indexOf = filePaths.indexOf("&");

        if (indexOf != -1) {
            filePaths = filePaths.substring(0, indexOf);
        }

        try {
            SmbFile file = new SmbFile(filePaths,
                    BaseApplication.getInstance().getAuthentication());
            // 获取文件的大小
            long contentLen = file.length();
            // 获取文件类型
            String contentType = FileUtils.getMIMEType(file.getName());
            System.out.println("contentType=====" + contentType);
            // 获取文文件流
            InputStream contentIn = file.getInputStream();

            if (contentLen <= 0 || contentType.length() <= 0
                    || contentIn == null) {
                httpReq.returnBadRequest();
                return;
            }

            HTTPResponse httpRes = new HTTPResponse();
            httpRes.setContentType(contentType);
            httpRes.setStatusCode(HTTPStatus.OK);
            httpRes.setContentLength(contentLen);
            httpRes.setContentInputStream(contentIn);

            httpReq.post(httpRes);

            contentIn.close();
        } catch (MalformedURLException e) {
            // httpReq.returnBadRequest();
            return;
        } catch (SmbException e) {
            // httpReq.returnBadRequest();
            return;
        } catch (IOException e) {
            // httpReq.returnBadRequest();
            return;
        }
    }
}
```

*其中涉及BaseApplication的，可以在前篇文章中看到；FileUtils中定义了静态变量ip="127.0.0.1",port=0,其他的就用到了根据文件名称获取MIME类型的方法，由于方法简单且代码太长就不贴了

## 4.开启/关闭转换服务
    Intent intent = new Intent(this, PlayFileService.class);
    startService(intent);
---
    Intent intent = new Intent(this, PlayFileService.class);
    stopService(intent);

## 其他相关
利用SMB协议远程查看电脑文件或者其他存储设备:  [点我直达](./trivia-smb-browse)