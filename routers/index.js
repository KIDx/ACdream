/*
 * req.session.msg: message to user
 * req.session.user: current user
 * req.session.cid: if current user has enter a private contest before,
 *   remember it, no need to wirte password again
 */

module.exports = function(app) {

  app.use('/', require('./home'));
  app.use('/user', require('./user'));
  app.use('/avatar', require('./avatar'));
  app.use('/addproblem', require('./addproblem'));
  app.use('/problem', require('./problem'));
  app.use('/statistic', require('./statistic'));
  app.use('/submit', require('./submit'));
  app.use('/status', require('./status'));
  app.use('/sourcecode', require('./sourcecode'));
  app.use('/rejudge', require('./rejudge'));
  app.use('/addcontest', require('./addcontest'));
  app.use('/contest', require('./contest'));
  app.use('/rating', require('./rating'));
  app.use('/addtopic', require('./addtopic'));
  app.use('/topic', require('./topic'));
  app.use('/comment', require('./comment'));
  app.use('/ranklist', require('./ranklist'));
  app.use('/standings', require('./standings'));
  app.use('/admin', require('./admin'));
  app.use('/register', require('./register'));

};
