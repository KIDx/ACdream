var mongoose = require('mongoose');
var db = require('../settings').db;
var Comm = require('../comm');
var LogErr = Comm.LogErr;

mongoose.connect(db, function (err) {
  if (err) {
    LogErr('connect to ' + db + ' error: ' + err.message);
    process.exit(1);
  }
});
