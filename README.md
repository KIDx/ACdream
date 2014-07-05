# ACdream Online Judge v1.3.0

## 关于pull request

温馨提示，所有提交都要严格遵循[代码规范](https://github.com/dead-horse/node-style-guide)。

## ubuntu下快速搭建开发环境

### 安装依赖
```
$ sudo apt-get update
$ sudo apt-get install imagemagick
$ sudo apt-get install python-software-properties python g++ make
$ sudo apt-get install libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev build-essential
```

### 安装node.js
```
$ sudo add-apt-repository ppa:chris-lea/node.js
$ sudo apt-get update
$ sudo apt-get install nodejs
```

### 安装redis数据库
http://blog.csdn.net/kidx_/article/details/26167091

### 安装mongodb数据库
http://docs.mongodb.org/manual/tutorial/install-mongodb-on-ubuntu/

### 数据库初始化
```
$ cd ACdream
$ mongorestore -h localhost -d acdream_db --directoryperdb acdream_db -drop
```

### 安装依赖模块
```
$ cd ACdream
$ sudo npm i
```

### 运行app
```
$ cd ACdream
$ node app.js
```
