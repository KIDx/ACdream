
var express = require('express');
var redis = require('redis');
var http = require('http');
var path = require('path');
var partials = require('express-partials');
var session = require('express-session');
var redisStore = require('connect-redis')(session);

var app = express();
var server = http.createServer(app);
var sessionStore = new redisStore();
var socket_opt = {};

var routers = require('./routers');
var settings = require('./settings');
var KEY = require('./routers/key');
var Logic = require('./logic');
var Comm = require('./comm');

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
  Logic.GetRedis(redis.createClient(), "marquee_data")
  .then(function(json){
    if (json) {
      res.locals.marquees = JSON.parse(json);
    }
    next();
  })
  .fail(function(err){
    next(err);
  })
  .done();
});

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

app.use(function(req, res){
  if (req.accepts('html')) {
    Comm.FailRender(null, res, Comm.ERR.PAGE_NOT_FOUND);
  }
});

//running server
server.listen(app.get('port'), function(){
  console.log("Server running at http://localhost:" + app.get('port'));
});

//socket
require('./socket')(require('socket.io')(server, socket_opt), sessionStore);
