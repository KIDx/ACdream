
var Q = require('q');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

function IDs() {
}

module.exports = IDs;

var idsObj = new Schema({
  name: {type: String, index: {unique: true}},
  id: Number
});

mongoose.model('idss', idsObj);
var idss = mongoose.model('idss');

IDs.get = function(idname, cnt) {
  var d = Q.defer();
  idss.findOneAndUpdate({name: idname}, {$inc: {'id': (cnt ? cnt : 1)}}, function(err, doc) {
    if (err) {
      d.reject(err);
    } else if (!doc) {
      d.resolve('db.idss should be init first!');
    } else {
      d.resolve(doc.id);
    }
  });
  return d.promise;
};
