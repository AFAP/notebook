# 服务端打包:
1. 构建`jar`包：`clean install -Dspring.profiles.active=prod`
2. 将包复制放到历史版本备份文件夹并改成按照时间命名的文件
3. 将包复制到server发布的文件目录
4. 停止服务
5. 启动服务
```
set bakFileName=D:\server-portal\历史版本\server-portal-%date:~0,4%%date:~5,2%%date:~8,2%%time:~0,2%%time:~3,2%%time:~6,2%.jar
set bakFileName=%bakFileName: =0%
echo F|xcopy .\target\server-portal.jar "%bakFileName%"
echo Y|xcopy .\target\server-portal.jar D:\server-portal\server-portal.jar
net stop server-portal1
net start server-portal1
```


# 前端VUE管理页面部署：
1. 服务器安装nodejs环境(8.19.4):https://nodejs.org/download/release/v16.20.0/
2. jenkins安装NodeJS插件(安装后需要重启jenkins，如服务器本身nodejs开始没安装，后安装的也需要重启下jenkins)
3. 创建构建任务，填写基本信息、线上版本地址等
4. 选择构建环境，勾选`Provide Node & npm bin/ folder to PATH`并选择对应版本
5. 使用cmd命令进行npm install
6. 使用cmd命令进行打包npm run build -- --exclude=.svn
7. 按需进行文件拷贝、备份（/s 表示递归子文件夹，要排除.svn）
```
set bakFileName=D:\nginx-1.22.0\html\admin-portal\历史版本\admin-portal-%date:~0,4%%date:~5,2%%date:~8,2%%time:~0,2%%time:~3,2%%time:~6,2%
set bakFileName=%bakFileName: =0%
echo .svn>exclude_file.txt
echo D|xcopy .\dist "%bakFileName%" /s /exclude:exclude_file.txt
echo A|xcopy .\dist D:\nginx-1.22.0\html\admin-portal\ /s /exclude:exclude_file.txt
```

