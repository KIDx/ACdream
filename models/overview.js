
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Settings = require('../settings');
var Comm = require('../comm');
var LogErr = Comm.LogErr;

function Overview() {
};

module.exports = Overview;

var overviewObj = new Schema({
  _id: {type: Object, index: {unique: true}},
  value: Object
});

overviewObj.index({
  '_id.cid': 1,
});

mongoose.model('overviews', overviewObj);
var overviews = mongoose.model('overviews');

Overview.find = function(Q, callback) {
  overviews.find(Q, function(err, docs) {
    if (err) {
      LogErr('Overview.find failed!');
    }
    return callback(err, docs);
  });
};

Overview.remove = function(Q, callback) {
  overviews.remove(Q, function(err){
    if (err) {
      LogErr('Overview.remove failed!');
    }
    return callback(err);
  });
};
