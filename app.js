var settings = require('./settings');
var express = require('express');
var routers = require('./routers');
var http = require('http');
var path = require('path');
var partials = require('express-partials');
var session = require('express-session');
var redisStore = require('connect-redis')(session);
var app = express();
var server = http.Server(app);
var sessionStore = new redisStore();
var socket_opt = {};
var KEY = require('./routers/key');

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
app.use(require('cookie-parser')(settings.cookie_secret));
app.use(require('body-parser').urlencoded({
  extended: true
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
  saveUninitialized: true
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
    res.locals.KEY = KEY;
    res.locals.loginInfo = req.cookies.loginInfo;
    if (res.locals.msg) {
      req.session.msg = null;
    }
    next();
  });
});

//routers
require('./routers')(app);

app.get('/notsupported', function(req, res){
  return res.render('notsupported', {
    layout: null
  });
});

app.get('/404', function(req, res, nxt){
  nxt();
});

app.use(function(req, res){
  res.status('404');
  if (req.accepts('html')) {
    return res.render('404', {
      layout: null
    });
  }
  res.type('txt').send('Not found');
});

//running server
server.listen(app.get('port'), function(){
  console.log("Server running at http://localhost:"+(process.env.PORT || 3000));
});

//socket
require('./socket')(require('socket.io')(server, socket_opt), sessionStore);
