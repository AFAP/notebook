# 服务器运行库
* Visual C++ 下载 VS 2015、2017、2019的运行库: [点击进入下载地址](https://learn.microsoft.com/zh-CN/cpp/windows/latest-supported-vc-redist?view=msvc-170)
* VS 2013的运行库 Visual C++ 2013 Redistributable Package: [点击进入下载地址](https://support.microsoft.com/zh-cn/topic/update-for-visual-c-2013-redistributable-package-d8ccd6a5-4e26-c290-517b-8da6cfdf4f10)(下载vcredist_x64.exe File Path的Chinese版本就可以)
* Visual C++ Redistributable for Visual Studio 2012 Update 4: [点击进入下载地址](https://www.microsoft.com/zh-cn/download/confirmation.aspx?id=30679)

--------------------------------------------------------------------------------

# Mysql ZIP 安装
1. 下载`mysql-5.7.38-winx64.zip`,并解压
2. 解压至D盘`D:\mysql\mysql-5.7.38-winx64`,在该目录下新建`my.ini`配置文件
```
[client]
# 设置mysql客户端默认字符集
default-character-set=utf8mb4
[mysql]
default-character-set=utf8mb4 
[mysqld]
#设置端口
port=29901
# 设置mysql的安装目录
basedir=D:\mysql\mysql-5.7.38-winx64
# 设置mysql数据库的数据的存放目录
datadir=D:\mysql\mysql-5.7.38-winx64\data
# 允许最大连接数
max_connections=200
# 服务端使用的字符集默认为8比特编码的latin1字符集
init-connect='SET NAMES utf8mb4'
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
# 创建新表时将使用的默认存储引擎
default-storage-engine=INNODB
```
3. 进入`D:\mysql\mysql-5.7.38-winx64\bin`，执行`mysqld  --initialize-insecure`(此命令大概率报错，需要补装运行库)
4. 安装Mysql服务`mysqld -install`
5. 开启Mysql服务`net start mysql`
6. 使用`mysql -uroot -p`进入，然后设置密码`set password for root@localhost = password('XXXXX')`
7. 修改密码可用`mysqladmin -u root -p password NewPassword`