
var Q = require('q');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Settings = require('../settings');

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

Overview.find = function(cond) {
  var d = Q.defer();
  overviews.find(cond, function(err, docs) {
    if (err) {
      d.reject(err);
    } else {
      d.resolve(docs);
    }
  });
  return d.promise;
};

Overview.remove = function(cond) {
  var d = Q.defer();
  overviews.remove(cond, function(err){
    if (err) {
      d.reject(err);
    } else {
      d.resolve();
    }
  });
  return d.promise;
};
