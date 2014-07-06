var settings = require('./settings');
var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var partials = require('express-partials');
var session = require('express-session');
var redisStore = require('connect-redis')(session);
var app = express();
var server = http.Server(app);
var sessionStore = new redisStore();
var Contest = require('./models/contest.js');
var socket_opt = {};

//connect mongodb
require('./models/connect');

if (app.get('env') == 'production') {
  console.log('production env.');
  socket_opt  = {
    'browser client minification': true,
    'browser client etag': true,
    'browser client gzip': true,
    'origins': 'acdream.info:80 115.28.76.232:80'
  };
  app.enable('trust proxy');
  app.enable('view cache');
} else {
  console.log('development env.');
}

//服务器配置
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(partials());

app.use(require('body-parser').urlencoded({
  extended: false
}));

//文件上传
app.use(require('multer')({
  dest: './uploads/',
  rename: function(fieldname, filename) {
    return filename;
  }
}));

//gzip压缩传输
app.use(require('compression')());

//express-session
app.use(session({
  secret: settings.cookie_secret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false
}));

//使用静态资源服务以及设置缓存(三天)
app.use(express.static(__dirname + '/public', {
  maxAge: 259200000
}));

//favicon.ico缓存(30天)
app.use(require('serve-favicon')(__dirname + '/public/favicon.ico', {
  maxAge: 2592000000
}));

//控制台日志
app.use(require('morgan')('dev'));

app.use(function(req, res, next){
  req.session.reload(function(){
    res.locals.user = req.session.user;
    res.locals.time = (new Date()).getTime();
    res.locals.msg = req.session.msg;
    if (res.locals.msg) {
      req.session.msg = null;
    }
    next();
  });
});

//#####server response
//主页
app.get('/', routes.index);
//user页面
app.get('/user/:name', routes.user);
//上传头像页面
app.get('/avatar', routes.avatar);
//addproblem页面
app.get('/addproblem', routes.addproblem);
app.post('/addproblem', routes.doAddproblem);
//addcontest页面
app.get('/addcontest', routes.addcontest);
app.post('/addcontest', routes.doAddcontest);
//addtopic页面
app.get('/addtopic', routes.addtopic);
app.post('/addtopic', routes.doAddtopic);
//登出
app.post('/logout', routes.logout);
//problemset面
app.get('/problemset', routes.problemset);
//problem页面
app.get('/problem', routes.problem);
//题目代码文件上传功能
app.post('/problem', routes.upload);
//onecontest页面
app.get('/onecontest/:cid', routes.onecontest);
//status页面
app.get('/status', routes.status);
//ranklist页面
app.get('/ranklist', routes.ranklist);
//standings页面
app.get('/standings', routes.standings);
//contest页面
app.get('/contest/:type', routes.contest);
//topic页面
app.get('/topic', routes.topic);
//onetopic页面
app.get('/topic/:id', routes.onetopic);
//submit页面及submit动作
app.get('/submit', routes.submit);
app.post('/submit', routes.doSubmit);
//sourcecode页面
app.get('/sourcecode/:runid', routes.sourcecode);
//statistic页面
app.get('/statistic/:pid', routes.statistic);
app.get('*', function(req, res){
  res.render('404', {
    layout: null
  });
});

//#####jquery ajax
//注册
app.post('/doReg', routes.doReg);
//创建验证码
app.post('/createVerifycode', routes.createVerifycode);
//用户登录
app.post('/doLogin', routes.doLogin);
//登录私有比赛
app.post('/loginContest', routes.loginContest);
//1.获取题目, addcontest.js引用;
//2.获取题目全部信息, onecontest.js引用
app.post('/getProblem', routes.getProblem);
//删除一个比赛或考试
app.post('/contestDelete', routes.contestDelete);
//显示比赛的题目到problemset
app.post('/toggleHide', routes.toggleHide);
//公有VIPContest的注册
app.post('/contestReg', routes.contestReg);
//get user's AC or not AC records
app.post('/getOverview', routes.getOverview);
//updateStatus
app.post('/updateStatus', routes.updateStatus);
//get a page of contest status
app.post('/getStatus', routes.getStatus);
//get a page of contest ranklist
app.post('/getRanklist', routes.getRanklist);
//get a page of contest discuss
app.post('/getTopic', routes.getTopic);
//add a discuss to contest Discuss
app.post('/addDiscuss', routes.addDiscuss);
//user页面的修改他人加题权限功能(for admin)
app.post('/changeAddprob', routes.changeAddprob);
//user页面的修改信息功能(setting)
app.post('/changeInfo', routes.changeInfo);
//user页面将他人密码恢复默认, 即123456(for admin)
app.post('/restorePsw', routes.restorePsw);
//编辑题目分类标签
app.post('/editTag', routes.editTag);
//单题重判
app.post('/rejudge', routes.rejudge);
//单个提交重判
app.post('/singleRejudge', routes.singleRejudge);
//VIP Contest添加参赛者(for admin)
app.post('/addContestant', routes.addContestant);
//将指定用户从比赛中移除(for admin)
app.post('/regContestRemove', routes.regContestRemove);
//上传图片
app.post('/imgUpload', routes.imgUpload);
//上传头像
app.post('/avatarUpload', routes.avatarUpload);
//上传数据
app.post('/dataUpload', routes.dataUpload);
//删除题目数据
app.post('/delData', routes.delData);
//删除题目图片
app.post('/delImg', routes.delImg);
//获取指定runID的CE信息
app.post('/getCE', routes.getCE);
//重新统计所有用户提交数和AC数
app.post('/recal', routes.recal);
//统计比赛rating
app.post('/calRating', routes.calRating);
//撤销某场比赛的rating
app.post('/resetRating', routes.resetRating);
//切换指定用户打星状态
app.post('/toggleStar', routes.toggleStar);
//切换话题置顶状态
app.post('/toggleTop', routes.toggleTop);
//添加回复
app.post('/review', routes.review);
//删除回复
app.post('/delComment', routes.delComment);
//编辑回复
app.post('/editComment', routes.editComment);
//设置指定题目的管理员(for admin)
app.post('/setProblemManager', routes.setProblemManager);

//running server
server.listen(app.get('port'), function(){
  console.log("Server running at http://localhost:3000");
});

//socket
require('./socket')(require('socket.io')(server, socket_opt), sessionStore);
