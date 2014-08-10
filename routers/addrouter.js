
var fs = require('fs');

if (process.argv.length < 3) {
  console.error('argv error.\nUsage: node addrouter.js router_name\n');
  process.exit(1);
}

var router_name = process.argv[2];

fs.exists('./'+router_name+'.js', function(exists){
  if (exists) {
    console.error('ERR: Can Not add router "' + router_name + '", because file "' + router_name + '.js" is already exist.\n');
    return ;
  }
  fs.readFile('./index.js', function(err, data){
    if (err) {
      console.error(err);
      return ;
    }
    if (data.toString().indexOf('/'+router_name) >= 0) {
      console.error('ERR: Can Not add router "' + router_name + '", because "' + router_name + '" is already exist in index.js.\n');
      return ;
    }

    var router = "  app.use('/" + router_name + "', require('./" + router_name + "'));";
    var str = data.toString().split('\n};')[0] + router + '\n\n};\n';
    fs.writeFile('./index.js', str, function(err){
      if (err) {
        console.error(err);
        return ;
      }
      console.log('update index.js success:');
      console.log('+'+router+'\n');
    });

    var code = "\n\
var router = require('express').Router();\n\
\n\
//var KEY = require('./key');\n\
\n\
//var Settings = require('../settings');\n\
var Comm = require('../comm');\n\
var LogErr = Comm.LogErr;\n\
\n\
/*\n\
 * 注释\n\
 */\n\
router.get('/path_to_get', function(req, res){\n\
  //add your code here.\n\
  return res.render('jade_name', {\n\
    title: 'The Title Of Web Page',\n\
    key: KEY.YOUR_KEY\n\
    //...\n\
  });\n\
});\n\
\n\
/*\n\
 * 注释\n\
 */\n\
router.post('/path_to_post', function(req, res){\n\
  //add your code here.\n\
  return res.end();\n\
});\n\
\n\
//if path_to_get == path_to_post, please use this kind of router\n\
/*\n\
 * all: 注释\n\
 * get: 注释\n\
 * post: 注释\n\
 */\n\
router.route('/same_path')\n\
.all(function(req, res, nxt){\n\
  //add your code here.\n\
  nxt();\n\
})\n\
.get(function(req, res){\n\
  //add your code here.\n\
  return res.render('jade_name', {\n\
    title: 'The Title Of Web Page',\n\
    key: KEY.YOUR_KEY\n\
    //...\n\
  });\n\
})\n\
.post(function(req, res){\
  //add your code here.\n\
  return res.end();\n\
});\n\
\n\
module.exports = router;\n";
    fs.writeFile('./'+router_name+'.js', code, function(err){
      if (err) {
        console.error(err);
        return ;
      }
      console.log('create '+router_name+'.js success.\n');
    });

  });
});
