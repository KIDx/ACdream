
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Comm = require('../comm');
var LogErr = Comm.LogErr;

function IDs (ids){
  this.name = ids.name;
  this.id = ids.id;
}

module.exports = IDs;

var idsObj = new Schema({
  name: {type: String, index: {unique: true}},
  id: Number
});

mongoose.model('idss', idsObj);
var idss = mongoose.model('idss');

IDs.get = function(idname, callback) {
  idss.findOneAndUpdate({name: idname}, {$inc:{'id':1}}, function(err, doc) {
    if (err) {
      LogErr('IDs.get failed!');
      return callback (err, null);
    }
    if (!doc) {
      err = 'You should init the ids first!';
      throw err;
    }
    return callback(err, doc.id);
  });
};
