/*
* Module dependencies.
*/
var express = require('express')
,	routes = require('./routes')
,	http = require('http')
,	path = require('path')
,	partials = require('express-partials')
,	session = require('express-session')
,	redisStore = require('connect-redis')(session)
,	settings = require('./settings')
,	OE = settings.outputErr
,	app = express()
,	server = http.createServer(app)
,	io = require('socket.io').listen(server)
,	fs = require('fs')
,	cookie = require('express/node_modules/cookie')
,	utils = require('connect/lib/utils')
,	sessionStore = new redisStore()
,	Contest = require('./models/contest.js');

//服务器配置
app.enable('trust proxy');
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(partials());
app.use(require('body-parser')());
app.use(require('multer')({
	dest: './uploads/',
	rename: function(fieldname, filename) {
		return filename;
	}
}));
app.use(require('compression')()); 		//gzip压缩传输
app.use(require('method-override')());
app.use(require('cookie-parser')());
app.use(session({
	secret: settings.cookie_secret,
	store: sessionStore
}));
app.use(express.static(__dirname+'/public', {maxAge: 259200000}));	//使用静态资源服务以及设置缓存(三天)
app.use(require('serve-favicon')(__dirname+'/public/favicon.ico', {maxAge: 2592000000}));

app.use(require('morgan')('dev'));
app.use(function(req, res, next){
  req.session.reload(function(){
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
	res.render('404', {layout: null});
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
//VIPContest增加指定用户(for admin)
app.post('/regContestAdd', routes.regContestAdd);
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
//切换指定用户打星状态
app.post('/toggleStar', routes.toggleStar);
//切换话题置顶状态
app.post('/toggleTop', routes.toggleTop);
//修改指定题目的难度
app.post('/updateEasy', routes.updateEasy);
//添加回复
app.post('/review', routes.review);

//清除服务器消息
app.post('/getMessage', function(req, res){
	res.header('Content-Type', 'text/plain');
	var msg = req.session.msg;
	req.session.msg = '';
	if (!msg)
		return res.end();
	return res.end(msg);
});

//connect mongodb
routes.connectMongodb();
//disconnect mongodb
app.on('close', function(err){
	if (err) {
		OE(err);
	}
	routes.disconnectMongodb();
});

//running server
server.listen(app.get('port'), function(){
	console.log("Server running at http://localhost:3000");
});

io.configure('production', function(){
  console.log('production env');
  var RedisStore = require('socket.io/lib/stores/redis')
  ,   redis  = require('socket.io/node_modules/redis')
  ,   pub    = redis.createClient()
  ,   sub    = redis.createClient()
  ,   client = redis.createClient();
  io.set('store', new RedisStore({
    redisPub : pub
  , redisSub : sub
  , redisClient : client
  }));
  //socket settings
  io.enable('browser client minification');  // send minified client
  io.enable('browser client etag');          // apply etag caching logic based on version number
  io.enable('browser client gzip');          // gzip the file
  io.set('log level', 1);                    // reduce logging
  io.set('transports', [
    'websocket'
  , 'flashsocket'
  , 'htmlfile'
  , 'xhr-polling'
  , 'jsonp-polling'
  ]);
  //set trusted hosts
  io.set('origins', 'acdream.info:80 115.28.76.232:80');
});

io.configure('development', function(){
  console.log('development env');
  io.set('transports', [ 
    'xhr-polling',
    'jsonp-polling'
  ]);
});

//websocket设置session
io.set('authorization', function(handshakeData, accept){
	if (!handshakeData.headers.cookie) {
		return accept('no cookie.', false);
	}
	handshakeData.cookies = utils.parseSignedCookies(
			cookie.parse(handshakeData.headers.cookie),
			settings.cookie_secret);
	sessionStore.get(handshakeData.cookies['connect.sid'], function(err, session){
		if (err || !session) {
			return accept('no session.', false);
		}
		handshakeData.session = session;
		return accept(null, true);
	});
});

//socket
io.sockets.on('connection', function(socket){
	var session = socket.handshake.session;
	if (session && session.user) {
		socket.on('broadcast', function(data, fn){
			if (data) {
				var cid = parseInt(data.room, 10);
				if (!cid) {
					return ;	//not allow
				}
				var RP = function() {
					socket.broadcast.to(data.room).emit('broadcast', data.msg);
          if (fn)
            fn(true);
				};
				if (session.user.name == 'admin') {
					return RP();
				}
				Contest.watch(cid, function(err, con){
					if (err) {
						OE(err);
            if (fn)
              fn(false);
						return ;
					}
					if (con && con.userName == session.user.name) {
						return RP();
					}
				});
			}
		});
	}
	socket.on('login', function(room){
		if (room) {
			socket.join(room.toString());
		}
	});
	socket.on('addDiscuss', function(room){
		if (room) {
			socket.broadcast.to(room).emit('addDiscuss');
		}
	});
});
