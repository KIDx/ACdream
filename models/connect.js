var mongoose = require('mongoose');
var db = require('../settings').db;

mongoose.connect(db, function (err) {
  if (err) {
    console.error('connect to %s error: ', db, err.message);
    process.exit(1);
  }
});
