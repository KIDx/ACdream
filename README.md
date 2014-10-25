# ACdream Online Judge v1.5.3

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

### 安装grunt
```
$ sudo npm i -g grunt-cli
```

### 安装依赖模块
```
$ cd ACdream
$ sudo npm i
```

### 运行app
```
$ cd ACdream
$ grunt
$ node app.js
```

###License
The MIT License (MIT)

Copyright (c) 2013-2014 ACdream

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
