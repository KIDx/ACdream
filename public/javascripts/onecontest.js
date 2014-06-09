//socket
var socket = io.connect('/');
var $msg = $('#msg_data');
var $msg_err = $('#msg_err');
var $broadcast = $('#broadcast');
var $dialog_bc = $('#dialog_bc');
var $bc_content = $dialog_bc.find('div.bc_content');

$(document).ready(function(){
  if ($dialog_bc.length) {
    $dialog_bc.jqm({
      overlay: 30,
      trigger: false,
      modal: true,
      closeClass: 'bc_close',
      onShow: function(h) {
        $broadcast.removeClass('disabled');
        h.o.fadeIn(200);
        h.w.fadeIn(200);
      },
      onHide: function(h) {
        h.w.fadeOut(200);
        h.o.fadeOut(200);
      }
    }).jqDrag('.jqDrag');
  }
  socket.emit('login', cid);
  socket.on('broadcast', function(data){
    $bc_content.text(data);
    $dialog_bc.jqmShow();
  });
  if ($broadcast.length) {
    $broadcast.click(function(){
      if ($(this).hasClass('disabled')) {
        return false;
      }
      var msg = JudgeString($msg.val());
      if (!msg) {
        errAnimate($msg_err, '消息不能为空！');
        return false;
      }
      $(this).addClass('disabled');
      socket.emit('broadcast', {room: cid, msg: msg}, function(res){
        if (res) {
          $bc_content.text('消息广播成功！');
          $msg.val('');
        } else {
          $bc_content.text('系统错误！');
        }
        $dialog_bc.jqmShow();
      });
    });
  }
});

var interceptorTime = 200; //截流响应
var cnt; //行号

var $div = $('#thumbnail');
var $contest = $('#contest');
var $p_span = $('span.cpid');
var pids = new Array();
var alias = new Array();
var ctype = parseInt($contest.attr('ctype'), 10);
var pageNum = $contest.attr('pageNum');
var contest_private = $contest.attr('psw');
var startTime = parseInt($contest.attr('startTime'), 10);
var status = parseInt($contest.attr('status'), 10);
var pending = $contest.attr('pending');
var TotalTime = parseInt($contest.attr('len'), 10)*60;
var cid = $contest.attr('cid');
var passTime = -pending;

var $progress = $('#progress');
var $bar = $progress.children('div.bar');
var $info = $('#contest-info');
var $contain = $('#info-contain');
var $lefttime = $('#lefttime');

function buildPager(page, n) {
  var cp = 5, html = '<ul>';
  var i = page - 2; if (i <= 0) i = 1;

  html += '<li id="1"';
  if (page == 1) html += ' class="disabled"';
  html += '><a href="javascript:;">&lt&lt</a></li>';
  if (i > 1) {
    html += '<li class="disabled"><a href="javascript:;">...</a></li>';
  }
  while (i < page) {
    html += '<li id="'+i+'"><a href="javascript:;">'+i+'</a></li>';
    ++i; --cp;
  }
  html += '<li class="active"><a href="javascript:;">'+i+'</a></li>';
  while (i < n && cp > 1) {
    ++i; --cp;
    html += '<li id="'+i+'"><a href="javascript:;">'+i+'</a></li>';
  }
  if (i < n) html += '<li class="disabled"><a href="javascript:;">...</a></li>';
  html += '<li id="'+n+'"';
  if (n == 0 || page == n) html += ' class="disabled"';
  html += '><a href="javascript:;">&gt&gt</a></li></ul>';
  return html;
}

var $status = $div.find('#statustab');
var $list = $('#list');
var $list_a;
var $tablebg = $('div.tablebg');
var $tbody = $tablebg.find('#statustable tbody');
var $search = $('#search');
var $pid = $('#pid');
var $result = $('#result');
var $Filter = $('#fil');
var $singleRejudge;
var statusQ = { cid:cid, page:1 };
var searchTimeout;
var Users;
var statusAjax;

var $loading = $('#loading');
var $retry = $('#retry');
var $retry_a = $retry.find('a');
var retryFunc;

$(document).ready(function(){
  $retry_a.click(function(){
    if ($(this).hasClass('disabled')) {
      return false;
    }
    $retry_a.addClass('disabled');
    $retry.hide();
    if (retryFunc) {
      $loading.show();
      retryFunc();
    }
  });
});

function setRetry(func) {
  $retry_a.removeClass('disabled');
  retryFunc = func;
  $loading.hide();
  $retry.slideDown();
}

function lang(s) {
  if (s == 1) return 'C';
  if (s == 2) return 'C++';
  if (s == 3) return 'Java';
  return 'unknow';
}

function buildRow(sol) {
  var html = '<tr class="';
  if (cnt % 2 == 1) html += 'odd';
  else html += 'even';
  ++cnt;
  if (sol.userName == current_user) html += ' highlight';
  html += '">';

  html += '<td>'+sol.runID+'</td>';
  var pvl = parseInt(Users[sol.userName], 10);
  html += '<td><a target="_blank" href="/user/'+sol.userName+'" class="user user-';
  html += UserCol(pvl)+'" title="'+UserTitle(pvl)+' '+sol.userName+'">'+sol.userName+'</a></td>';
  html += '<td><a href="#problem-'+pmap[sol.problemID]+'">'+pmap[sol.problemID]+'</a></td>';

  html += '<td rid="'+sol.runID+'"';
  if (sol.result == 8 && (sol.userName == current_user || current_user == 'admin')) {
    html += ' class="bold"><a href="javascript:;" rid="'+sol.runID+'" class="CE special-text">Compilation Error</a>';
  } else {
    html += ' class="bold '+Col(sol.result);
    if (sol.result < 2) html += ' unknow';
    html += '">'+Res(sol.result);
  }
  if (current_user == 'admin' && sol.result > 2) {
    html += singleRejudgeBtn;
  }
  html += '</td>';

  var tpstr, tmp = '<span class="user user-gray">---</span>';
  if (sol.result == 0) {
    tpstr = pendingImg;
  } else if (sol.result == 1) {
    tpstr = runningImg;
  } else if (!NAN(sol.time)) {
    tpstr = sol.time+' MS';
  } else {
    tpstr = tmp;
  }
  html += '<td>'+tpstr+'</td>';

  if (parseInt(sol.memory, 10) >= 0) {
    tpstr = sol.memory+' KB';
  } else {
    tpstr = tmp;
  }
  html += '<td>'+tpstr+'</td>';
  html += '<td><a target="_blank" href="/sourcecode/'+sol.runID+'">'+lang(sol.language)+'</a></td>'

  if (parseInt(sol.length, 10)) {
    tpstr = sol.length+' B';
  } else {
    tpstr = tmp;
  }
  html += '<td>'+tpstr+'</td>';
  html += '<td>'+getDate(sol.inDate, true)+'</td>';
  html += '</tr>';
  return html;
}

function Response(json) {
  if (!statusAjax || !json || !isActive(2)) return ;
  Users = json.pop();
  var n = json.pop(), sols = json.pop();
  $list.html(buildPager(statusQ.page, n));
  var html;
  if (!sols || sols.length == 0) {
    html = '<tr class="odd"><td class="error-text center" colspan="9">No Status are matched.</td></tr>';
  } else {
    cnt = 1;
    html = $.map(sols, buildRow).join('');
  }
  if ($list_a && $list_a.length) {
    $list_a.unbind('click');
  }
  if ($singleRejudge && $singleRejudge.length) {
    $singleRejudge.unbind();
  }
  $tbody.html( html );
  $list_a = $list.find('a');
  $list_a.click(function(){
    if ($(this).parent().hasClass('active') || $(this).parent().hasClass('disabled'))
      return false;
    window.location.hash = '#status-'+$search.val()+'-'+$pid.val()+'-'+$result.val()+'-'+$(this).parent().attr('id');
  });
  $singleRejudge = $tbody.find('a.rejudge');
  if ($singleRejudge.length) {
    bindSingleRejudge($singleRejudge);
  }
  BindCE();
  $loading.hide();
  $status.fadeIn(100, function(){
    flg = {};
    getStatus();
  });
}

function GetStatus() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(function(){
    var ts = JudgeString($search.val()), tp = $pid.val(), tr = $result.val();
    if (tp == 'nil') tp = '';
    else tp = fmap[tp];
    if (tr == 'nil') tr = '';
    statusQ.name = ts;
    statusQ.pid = tp;
    statusQ.result = tr;
    statusAjax = $.ajax({
      type: 'POST',
      url: '/getStatus',
      dataType: 'json',
      data: statusQ,
      timeout: 5000,
      error: function(){
        if (statusAjax)
          statusAjax.abort();
        setRetry(GetStatus);
      }
    }).done(Response);
  }, interceptorTime);
}

//pmap[pid]='A, B, C...', fmap['A, B, C...'] = pid
var pmap = {}, fmap = {};

function index(pid) {
  return pmap[pid].charCodeAt(0)-65;
}

var $hid = $('div.hidden, li.hidden');
var $tablink = $div.find('a.tablink');

function isActive(i) {
  return $tablink.eq(i).parent().hasClass('active');
}

function doActive(i) {
  $tablink.eq(i).parent().addClass('active');
}

function noActive(i) {
  $tablink.eq(i).parent().removeClass('active');
}

//overview
var $overview = $div.find('#overviewtab');
var $o_index = $overview.find('td.o_index');
var $o_sol = $overview.find('td.o_sol');
var $clone = $('#clone');
var prob_num = $p_span.length;
var overviewTimeout;
var overviewAjax;

function OverviewResponse(json) {
  if (!overviewAjax || !json || !isActive(0)) return ;
  var sols = json.pop(), res = json.pop();
  if (sols) {
    $.each(sols, function(i, p){
      var $oi = $o_index.eq(index(p._id));
      if (p.result == 2) {
        $oi.addClass('AC');
        $oi.next().next().addClass('AC-fill');
      } else {
        $oi.addClass('WA');
        $oi.next().next().addClass('WA-fill');
      }
    });
  }
  if (res) {
    $.each(res, function(i, p){
      var $oi = $o_sol.eq(pmap[p._id].charCodeAt(0)-65), idx = index(p._id);
      var _ac = '<a href="#status--'+F.charAt(idx)+'-'+2+'">'+p.value.AC+'</a>';
      var _all = '<a href="#status--'+F.charAt(idx)+'"'+'">'+p.value.all+'</a>';
      $oi.html(_ac+'&nbsp/&nbsp'+_all);
    });
  }
  if ($clone.length) {
    $clone.unbind('click');
    $clone.click(function(){
      if ($dialog_lg.length > 0) {
        nextURL = '/addcontest?cID=-'+cid+'&type=1';
        $dialog_lg.jqmShow();
      } else {
        window.location.href = '/addcontest?cID=-'+cid+'&type=1';
      }
    });
  }
}

function GetOverview() {
  clearTimeout(overviewTimeout);
  overviewTimeout = setTimeout(function(){
    overviewAjax = $.ajax({
      type: 'POST',
      url: '/getOverview',
      dataType: 'json',
      data: {cid: cid},
      timeout: 5000,
      error: function(){
        if (overviewAjax)
          overviewAjax.abort();
      }
    }).done(OverviewResponse);
    $loading.hide();
    $overview.fadeIn(100);
  }, interceptorTime);
}

//problem
//标记之前浏览页是否为problem页
var PreTab = 0;

var $problem = $div.find('#problemtab');
var $probcontain = $problem.children('#prob-contain');
var $problemlink = $problem.find("li.problemlink");
var $title = $problem.find('h3#problem_title > span');
var $limit = $problem.find('span.limit');
var F = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
var ID, problemTimeout;
var problemAjax;

var $content = $('#content');

var S = ['Problem Description', 'Input', 'Output', 'Sample Input', 'Sample Output', 'Hint', 'Source'];
var $probsubmit = $('#probsubmit');
var $probsubmit2 = $('#probsubmit2');
var $rejudge = $('#rejudge');
var ProblemCache = {};

function ShowProblem(prob) {
  if (!prob) return ;
  function getTitle(i) {
    return alias[i] ? alias[i] : prob.title;
  }
  $title.eq(0).text( F.charAt(ID) );
  $title.eq(1).text( getTitle(ID) );
  $limit.eq(0).text( 2*prob.timeLimit+'/'+prob.timeLimit );
  $limit.eq(1).text( 2*prob.memoryLimit+'/'+prob.memoryLimit );
  if (prob.spj == 1) {
    $limit.eq(2).html('&nbsp;&nbsp;&nbsp;&nbsp; Special Judge');
  } else if (prob.TC == 1) {
    $limit.eq(2).html('&nbsp;&nbsp;&nbsp;&nbsp; TC 模式');
  } else {
    $limit.eq(2).html('');
  }
  var q = [prob.description, prob.input, prob.output, prob.sampleInput,
  prob.sampleOutput, prob.hint];
  var tcon = '';
  for (i = 0; i < 7; i++) {
    if (!q[i]) continue;
    tcon += '<h4>'+S[i]+'</h4><div class="accordion-inner">';
    if (i === 3 || i === 4) {
      tcon += '<pre class="sample">'+q[i]+'</pre>';
    } else {
      tcon += q[i];
    }
    tcon += '</div>';
  }
  $content.html(tcon);
  $problemlink.removeClass('active');
  $problemlink.eq(ID).addClass('active');
  //增加题号,题目属性
  $probsubmit.attr('pid', prob.problemID); $probsubmit2.attr('pid', prob.problemID);
  $probsubmit.next().attr('href', '#status--'+F.charAt(ID)); $probsubmit2.next().attr('href', '#status--'+F.charAt(ID));
  $probsubmit.attr('tname', getTitle(ID)); $probsubmit2.attr('tname', getTitle(ID));
  if ($rejudge.length) {
    $rejudge.unbind('click');
    $rejudge.click(function(){
      if ($(this).hasClass('disabled') || !confirm('rejudge会给用户带来较大影响，确定要rejudge？')) {
        return false;
      }
      $rejudge.addClass('disabled');
      $.ajax({
        type: 'POST',
        url: '/rejudge',
        data: {
          pid: prob.problemID,
          cid: '1'
        },
        dataType: 'text',
        error: function() {
          $rejudge.removeClass('disabled');
          ShowMessage('无法连接到服务器！');
        }
      }).done(function(res){
        if (res == '0') ShowMessage('Failed! You have no permission to Rejudge.');
        else if (res == '1') {
          ShowMessage('Problem '+F.charAt(ID)+' has been Rejudged successfully!');
          window.location.hash = '#status--'+F.charAt(ID);
        }
        $rejudge.removeClass('disabled');
      });
    });
  }
  $loading.hide();
  if (PreTab == 1) {
    $probcontain.fadeIn(200);
  } else {
    $problem.fadeIn(200);
  }
  PreTab = 1;
  $tablink.eq(1).attr('href', '#problem-'+F.charAt(ID));
}

function ProblemResponse(prob) {
  if (!problemAjax || !prob || !isActive(1)) return ;
  ShowProblem(ProblemCache[ID] = prob);
}

function GetProblem() {
  if (!ID || ID < 0) {
    ID = 0;
  }
  ShowProblem(ProblemCache[ID]);
  clearTimeout(problemTimeout);
  problemTimeout = setTimeout(function(){
    problemAjax = $.ajax({
      type: 'POST',
      url: '/getProblem',
      dataType: 'json',
      data: {
        cid: cid,
        pid: pids[ID],
        lastmodified: ProblemCache[ID] ? ProblemCache[ID].lastmodified : null
      },
      timeout: 5000,
      error: function() {
        if (problemAjax)
          problemAjax.abort();
        if (!ProblemCache[ID])
          setRetry(GetProblem);
      }
    }).done(ProblemResponse);
  }, interceptorTime);
}

var $rank = $div.find('#ranktab');
var $rankheader = $rank.find('#rankheader');
var $ranktable = $rank.find('#tablediv');
var $ranktbody = $ranktable.find('tbody');
var $ranklist = $rank.find('#ranklist');
var $ranklist_a;
var $removebtn;
var $rank_refresh = $rank.find('#rank_refresh');
var rankQ = {cid:cid, page:1};
var rank = 1;
var rankTimeout;
var FB = {};
var rankAjax;
var rankInterval;
var total; //提交过代码的人数

$(document).ready(function(){
  //deal with overflow rank table
  $rank.width($('#widthfix').width()-22);
  //deal with rankheader
  $(window).scroll(function(){
    if (!isActive(3)) {
      return false;
    }
    if ($(window).scrollTop() > $ranktable.offset().top) {
      $rankheader.show();
    } else {
      $rankheader.hide();
    }
  });
});

function buildRank(U) {
  var user = U.value, html = '<tr class="';

  if (cnt % 2 == 1) html += 'odd';
  else html += 'even';
  if (U.name == current_user) html += ' highlight';

  html += '"><td';

  var tk;
  if (U.rank) {
    tk = U.rank;
  } else {
    tk = rank;
  }
  if (user.solved > 0) {
    if (tk <= total*0.6 + 0.9) {
      html += ' class="';
      if (tk <= total*0.1 + 0.9) html += 'gold';
      else if (tk <= total*0.3 + 0.9) html += 'silver';
      else html += 'bronze';
      html += '"';
    }
  }

  html += '>';
  if (U.rank) {
    html += U.rank;
  } else if (U.star) {
    html += '*';
  } else {
    html += rank++;
  }
  html += '</td>';

  var pvl = parseInt(Users[U.name], 10);
  html += '<td><a target="_blank" href="/user/'+U.name+'" class="user user-'+UserCol(pvl);
  html += '" title="'+UserTitle(pvl)+' '+U.name+'">';
  html += U.name+'</a>';
  if (current_user == 'admin') {
    html += '<button class="close" style="margin-right:5px;" user="'+U.name+'" title="移除">&times;</button>';
  }
  html += '</div></td><td>';
  if (I[U.name]) {
    html += '<span title="'+I[U.name]+'" class="u-info user-gray ellipsis">'+I[U.name]+'</span>';
  }
  html += '</td><td>'+user.solved+'</td>';
  html += '<td>'+parseInt((user.penalty-user.solved*startTime)/60000, 10)+'</td>';

  for (i = 0; i < prob_num; i++) {
    var pid = fmap[F.charAt(i)];
    html += '<td';
    if (user.status && user.status[pid]) {
      var WA = user.status[pid].wa, st, pt;
      if (WA >= 0) {
        if (FB[pid] == U.name) {
          style = 'fb-text'; st = 'first_blood'; pt = 'fb-cell-time';
        } else {
          style = 'accept-text'; st = 'accept'; pt = 'cell-time';
        }
        html += ' class="'+st+'">'

        html += '<span class="'+style+'">+';
        if (WA > 0) html += WA;
        html += '</span>';
        html += '<span class="'+pt+'">'+deal((user.status[pid].inDate-startTime)/1000, 1)+'</span>';
      } else if (WA < 0) {
        html += '><span class="failed">'+WA+'</span>';
      }
    } else {
      html += '>';
    }
    html += '</td>';
  }

  ++cnt;

  html += '</tr>';
  return html;
}

function RankResponse(json) {
  if (!rankAjax || !json || !isActive(3)) return ;
  total = json.pop();
  rank = json.pop();
  FB = json.pop();
  $ranklist.html( buildPager(rankQ.page, json.pop()) );
  I = json.pop();
  Users = json.pop();
  var users = json.pop();
  if (!users || users.length == 0) {
    html = '<tr class="odd"><td class="error-text center" colspan="'+(5+prob_num)+'">No Records till Now.</tr>';
  } else {
    cnt = 1;
    html = $.map(users, buildRank).join('');
  }
  if ($ranklist_a && $ranklist_a.length) {
    $ranklist_a.unbind('click');
  }
  if ($removebtn && $removebtn.length) {
    $removebtn.unbind();
  }
  $ranktbody.html(html);
  $ranklist_a = $ranklist.find('a');
  $ranklist_a.click(function(){
    if ($(this).parent().hasClass('active') || $(this).parent().hasClass('disabled'))
      return false;
    window.location.hash = '#rank-'+$(this).parent().attr('id');
  });
  if (current_user == 'admin') {
    $removebtn = $('button.close');
    $removebtn.click(function(){
      if ($(this).hasClass('disabled')) {
        return false;
      }
      if (!confirm('确定要将该参赛者从比赛中移除吗？')) {
        return false;
      }
      $removebtn.addClass('disabled');
      $.ajax({
        type: 'POST',
        url: '/regContestRemove',
        data: {
          cid: cid,
          name: $(this).attr('user')
        },
        dataType: 'text',
        error: function() {
          $removebtn.removeClass('disabled');
          ShowMessage('无法连接到服务器！');
        }
      }).done(function(){
        window.location.reload(true);
      });
    });
  }
  $retry.hide();
  $loading.hide();
  $rank.fadeIn(100);
}

function GetRanklist(flg) {
  clearTimeout(rankTimeout);
  rankTimeout = setTimeout(function(){
    rankAjax = $.ajax({
      type: 'POST',
      url: '/getRanklist',
      dataType: 'json',
      data: rankQ,
      timeout: 5000,
      error: function() {
        if (rankAjax)
          rankAjax.abort();
        if (!flg)
          setRetry(GetRanklist);
      }
    }).done(RankResponse);
  }, interceptorTime);
}

function clearTimer() {
  clearTimeout(overviewTimeout);
  clearTimeout(problemTimeout);
  clearTimeout(searchTimeout);
  clearTimeout(rankTimeout);
}

var $discuss = $div.find('#discusstab');
var $distbody = $discuss.find('table tbody');
var $discuss_refresh = $discuss.find('#discuss_refresh');
var $discuss_tips = $div.find('#discuss_tips');
var $dislist = $('#dislist');
var $dislist_a;
var discuss_tips = 0;
var discussQ = {cid:cid, page:1};
var discussTimeout;
var Imgtype;
var discussAjax;

function buildDiscuss(p) {
  function getImg(u) {
    if (Imgtype[u]) {
      return '/img/avatar/'+u+'/4.'+Imgtype[u];
    }
    return '/img/avatar/%3Ddefault%3D/4.jpeg';
  }
  var html = '<tr';
  if (current_user == p.user) {
    html += ' class="highlight"';
  }
  html += '><td><a target="_blank" href="/user/'+p.user+'">';
  html += '<img class="img_s topic_img" title="'+p.user+'" alt="'+p.user+'" src="'+getImg(p.user)+'" />'
  html += '</a></td><td>';
  html += '<span class="user-green">'+p.reviewsQty+'</span><span class="user-gray">/'+p.browseQty+'</span>';
  html += '</td><td style="text-align:left;" class="ellipsis">';
  html += '<a target="_blank" href="/topic/'+p.id+'">'+p.title+'</a></td>';
  html += '<td>';
  if (p.lastReviewer) {
    html += '<a class="topic_timer" target="_blank" href="/topic/'+p.id+'#'+p.lastComment+'">';
    html += '<img class="img_ss" title="'+p.lastReviewer+'" alt="'+p.lastReviewer+'" src="'+getImg(p.lastReviewer)+'">';
    html += '<span>'+p.lastReviewTime+'</span>';
    html += '</a>';
  } else {
    html += '<span class="user-gray fr">'+p.lastReviewTime+'</span>';
  }
  html += '</td></tr>';
  return html;
}

function DiscussResponse(json) {
  if (!discussAjax || !json || !isActive(4)) return ;
  Imgtype = json.pop();
  var n = json.pop(), tps = json.pop();
  $dislist.html(buildPager(discussQ.page, n));
  var html;
  if (!tps || tps.length == 0) {
    html = '<tr><td class="error-text" colspan="6">No Records are matched.</td></tr>';
  } else {
    cnt = 1;
    html = $.map(tps, buildDiscuss).join('');
  }
  if ($dislist_a && $dislist_a.length) {
    $dislist_a.unbind('click');
  }
  $distbody.html( html );
  $dislist_a = $dislist.find('a');
  $dislist_a.click(function(){
    if ($(this).parent().hasClass('active') || $(this).parent().hasClass('disabled'))
      return false;
    window.location.href = '#discuss-'+$(this).parent().attr('id');
  });
  $loading.hide();
  $discuss.fadeIn(100);
  discuss_tips = 0;
  $discuss_tips.hide();
}

function GetDiscuss() {
  clearTimeout(discussTimeout);
  discussTimeout = setTimeout(function(){
    discussAjax = $.ajax({
      type: 'POST',
      url: '/getTopic',
      dataType: 'json',
      data: discussQ,
      timeout: 5000,
      error: function() {
        if (discussAjax)
          discussAjax.abort();
        setRetry(GetDiscuss);
      }
    }).done(DiscussResponse);
  }, interceptorTime);
}

function run() {
  clearInterval(rankInterval);
  clearAjax();
  var str = window.location.hash;
  if (!str) str = '#overview';
  var sp = str.split('-');
  var a = sp[0], b = sp[1], c = sp[2], d = sp[3], e = sp[4];
  ID = 0;
  clearTimer();
  if (a != '#problem' || !PreTab) {
    hideAll();
  }
  $retry.hide();
  $loading.show();
  flg = {}; //important [update status]
  for (var i = 0; i < 5; i++) {
    noActive(i);
  }
  switch(a) {
    case '#problem': {
      if (b) ID = b.charCodeAt(0)-65;
      doActive(1);
      if (PreTab == 1) $probcontain.hide();
      GetProblem();
      break;
    }
    case '#status': {
      doActive(2);
      $search.val(b ? b : '');
      $pid.val(c ? c : 'nil');
      $result.val(d ? d : 'nil');
      statusQ.page = e ? parseInt(e, 10) : 1;
      GetStatus();
      PreTab = 0;
      break;
    }
    case '#rank': {
      doActive(3);
      rankInterval = setInterval(function(){
        GetRanklist(true);
      }, 30000);
      rankQ.page = b ? parseInt(b, 10) : 1;
      GetRanklist();
      PreTab = 0;
      break;
    }
    case '#discuss': {
      doActive(4);
      discussQ.page = b ? parseInt(b, 10) : 1;
      GetDiscuss();
      PreTab = 0;
      break;
    }
    default: {
      doActive(0);
      GetOverview();
      PreTab = 0;
      break;
    }
  }
}

function pendingTimer() {
  var left = deal(pending);
  var infoleft = '-'+left;
  if (infoleft != $info.text()) {
    $info.text(infoleft);
  }
  if ($lefttime.length) {
    if (left != $lefttime.text()) $lefttime.text(left);
  }
  --pending;
  if (pending < 0) {
    window.location.reload(true);
  }
}

function runningTimer() {
  if (passTime > TotalTime) {
    window.location.reload(true);
  } else {
    var tp = passTime*100.0/TotalTime;
    if (tp > 50) $contain.css({'text-align':'left'});
    $bar.css({width:tp+'%'});
    $info.css({width:(100<=tp+2.5)?'100%':tp+2.5+'%'});
    $info.text('-'+deal(TotalTime - passTime));
    ++passTime;
  }
}

function runContest() {
  //bulid map pmap and fmap
  $.each($p_span, function(i, p){
    alias.push($(p).attr('alias'));
    pids.push($(p).attr('pid'));
    pmap[pids[i]] = F.charAt(i);
    fmap[F.charAt(i)] = pids[i];
  });

  if (status > 0 || $contest.attr('watch')) {
    $hid.removeClass('hidden');
    run();
    $(window).hashchange(function(){
      run();
    });
  } else {
    doActive(0);
    $overview.fadeIn(100);
    PreTab = -1;
  }
}

//bind links and run contest
$(document).ready(function(){
  $tablink.click(function(){
    if ($(this).parent().hasClass('active')) {
      return false;
    }
  });
  $problemlink.click(function(){
    if ($(this).hasClass('active')) {
      return false;
    }
    $problemlink.removeClass('active');
    $(this).addClass('active');
  });
  if (status == 0) {
    pendingTimer();
    setInterval(pendingTimer, 1000);
  } else if (status == 1) {
    runningTimer();
    setInterval(runningTimer, 1000);
  }
  runContest();
});

//bind status, rank refresh and discuss refresh
$(document).ready(function(){
  $Filter.click(function(){
    window.location.hash = '#status-'+$search.val()+'-'+$pid.val()+'-'+$result.val();
  });
  $search.keyup(function(e){
    if (e.keyCode == 13) {
      $Filter.click();
    }
  });
  $rank_refresh.click(function(){
    hideAll();
    $loading.show();
    GetRanklist();
  });
  $discuss_refresh.click(function(){
    hideAll();
    $loading.show();
    GetDiscuss();
  });
});

//bind submit
var $dialog_sm = $('#dialog_sm');
var $sublink = $('a.consubmit');
var pid_index;

$(document).ready(function(){
  $.each($sublink, function(i, p) {
    $(p).click(function(){
      if ($dialog_lg.length) {
        nextURL = '';
        $dialog_lg.jqmShow();
        return false;
      }
      if (!$dialog_sm.length) {
        ShowMessage('You can not submit because you have not registered the contest yet!');
        return false;
      }
      $dialog_sm.find('#error').html('&nbsp;');
      $dialog_sm.find('#lang').val(2);
      $dialog_sm.find('textarea').val('');
      pid_index = $(this).attr('pid');
      $dialog_sm.find('span#pid').text(pmap[pid_index]+' - '+$(this).attr('tname'));
      $dialog_sm.jqmShow();
    });
  });

  if ($dialog_sm.length) {
    var $submit_code = $dialog_sm.find('textarea');
    var $submit_err = $dialog_sm.find('#error');
    var $submit = $dialog_sm.find('#jqcodesubmit');
    var $alert = $dialog_sm.find('div.alert');
    var $alert_close = $alert.find('button.close');
    $alert_close.click(function(){
      $alert.hide();
    });
    $dialog_sm.jqm({
      overlay: 30,
      trigger: false,
      modal: true,
      closeClass: 'submitclose',
      onShow: function(h) {
        $alert.hide();
        $submit.text('Submit').removeClass('disabled');
        h.o.fadeIn(200);
        h.w.fadeIn(200, function(){
          $dialog_sm.find('textarea').focus();
        });
      },
      onHide: function(h) {
        h.w.fadeOut(200);
        h.o.fadeOut(200);
      }
    }).jqDrag('.jqDrag').jqResize('.jqResize');
    $submit.click(function(){
      if ($(this).hasClass('disabled')) {
        return false;
      }
      var code = $submit_code.val(), lang = $dialog_sm.find('select').val();
      if (code.length < 50 || code.length > 65536) {
        errAnimate($submit_err, 'the length of code must be between 50B to 65535B');
        return false;
      }
      if (lang < 3 && code.indexOf('%I64') >= 0 && $alert.is(':hidden')) {
        $alert.slideDown();
        return false;
      }
      $submit.text('Submitting...').addClass('disabled');
      $.ajax({
        type: 'POST',
        url: '/submit',
        data: {
          pid: pid_index,
          cid: cid,
          code: code,
          lang: lang
        },
        dataType: 'text',
        error: function() {
          $submit.text('Submit').removeClass('disabled');
          ShowMessage('无法连接到服务器！');
        }
      }).done(function(err){
        $dialog_sm.jqmHide();
        if (!err) {
          ShowMessage('Your code for problem '+pmap[pid_index]+' has been submited successfully!');
        } else if (err == '6') {
          ShowMessage('同一个会话在5秒内只能交一次代码，请稍候再交。');
        } else if (err == '1') {
          window.location.reload(true);
          return ;
        } else if (err == '2') {
          ShowMessage('You can not submit because you have not registered the contest yet!');
        } else if (err == '3') {
          ShowMessage('系统错误！');
        } else if (err == '4') {
          ShowMessage('The problem is not exist!');
        } else if (err == '5') {
          ShowMessage('The language is not exit!');
        }
        window.location.hash = '#status';
      });
    });
  }
});

var $del = $('a#delete');

$(document).ready(function(){
  if ($del.length) {
    $del.click(function(){
      if ($(this).hasClass('disabled')) {
        return false;
      }
      if (!window.confirm('Are you sure to delete this contest?')) {
        return false;
      }
      $del.addClass('disabled');
      $.ajax({
        type: 'POST',
        url: '/contestDelete',
        data: { cid : cid },
        dataType: 'text',
        error: function() {
          $del.removeClass('disabled');
          ShowMessage('无法连接到服务器！');
        }
      }).done(function(){
        window.location.href = '/contest/'+ctype;
      });
    });
  }
});

//show problems in problemset
var $toggleHide = $('a.toggleHide');

$(document).ready(function(){
  if ($toggleHide.length) {
    $toggleHide.click(function(){
      var $p = $(this);
      if ($p.hasClass('disabled')) {
        return false;
      }
      $p.addClass('disabled');
      var pid = $p.attr('pid');
      $.ajax({
        type: 'POST',
        url: '/toggleHide',
        data: { pid: pid },
        dataType: 'text',
        error: function() {
          $p.removeClass('disabled');
          ShowMessage('无法连接到服务器！');
        }
      }).done(function(res){
        if (!res) {
          window.location.reload(true);
          return ;
        } else if (res == '3') {
          ShowMessage('系统错误！');
        } else {
          if (res == 'h') {
            $p.text('显示到题库');
          } else {
            $p.text('隐藏');
          }
          ShowMessage('Problem '+pid+' have been Updated successfully!');
        }
        $p.removeClass('disabled');
      });
    });
  }
});

//toggle star
var $star = $('#star');
var $starstr = $('#starstr');
var $starerr = $('#starerr');

$(document).ready(function(){
  if ($star.length) {
    $star.click(function(){
      if ($(this).hasClass('disabled')) {
        return false;
      }
      var str = JudgeString($starstr.val());
      if (!str) {
        errAnimate($starerr, '用户名不能为空！');
        return false;
      }
      $star.addClass('disabled');
      $.ajax({
        type: 'POST',
        url: '/toggleStar',
        data: {
          cid: cid,
          str: str,
          type: $('#type').val()
        },
        dataType: 'text',
        error: function() {
          $star.removeClass('disabled');
          ShowMessage('无法连接到服务器！');
        }
      }).done(function(){
        window.location.reload(true);
      });
    });
  }
});

//add discuss
var $publish = $('#publish');
var $publish_pid = $('#publish_pid');
var $publish_err = $('#publish_err');
var $publish_title = $('#publish_title');
var $publish_content = $('#publish_content');

$(document).ready(function(){
  $publish.click(function(){
    if ($(this).hasClass('disabled')) {
      return false;
    }
    var title = JudgeString($publish_title.val());
    if (!title) {
      errAnimate($publish_err, '标题不能为空！');
      return false;
    }
    var content = JudgeString($publish_content.attr('value'));
    if (!content) {
      errAnimate($publish_err, '内容不能为空！');
      return false;
    }
    $publish.addClass('disabled');
    $.ajax({
      type: 'POST',
      url: '/addDiscuss',
      data: {
        cid: cid,
        title: $publish_pid.val()+'题：'+title,
        content: content
      },
      dataType: 'text',
      error: function() {
        $publish.removeClass('disabled');
        ShowMessage('无法连接到服务器！');
      }
    }).done(function(res){
      if (!res) {
        window.location.hash = 'discuss';
        GetDiscuss();
        ShowMessage('发表成功！');
        $publish_pid.val('A');
        $publish_title.val('');
        $publish_content.attr('value', '');
        ChangeScrollTop(200);
        socket.emit('addDiscuss', cid);
      } else if (res == '1') {
        ShowMessage('系统错误！');
      } else if (res == '2') {
        window.location.href = '/';
        return ;
      }
      $publish.removeClass('disabled');
    });
  });
});

//use socket to listen addDiscuss event
$(document).ready(function(){
  socket.on('addDiscuss', function(){
    if (!isActive(4)) {
      ++discuss_tips;
      $discuss_tips.text(discuss_tips).show();
    } else {
      GetDiscuss();
    }
  });
});

function hideAll() {
  $problem.hide();
  $status.hide();
  $rank.hide();
  $discuss.hide();
  $overview.hide();
}

function clearAjax() {
  if (overviewAjax) overviewAjax.abort();
  if (problemAjax) problemAjax.abort();
  if (statusAjax) statusAjax.abort();
  if (rankAjax) rankAjax.abort();
  if (discussAjax) discussAjax.abort();
}

//calculate ratings
var $cal = $('#calrating');

$(document).ready(function(){
  $cal.click(function(){
    if ($cal.hasClass('disabled')) {
      return false;
    }
    if (!confirm('确定要统计rating吗？')) {
      return false;
    }
    $cal.addClass('disabled').text('请稍候...');
    $.ajax({
      type: 'POST',
      url: '/calRating',
      data: { cid: cid },
      dataType: 'text',
      error: function() {
        $cal.text('统计rating').removeClass('disabled');
        ShowMessage('无法连接到服务器！');
      }
    }).done(function(res){
      if (res == '-1' || res == '-2') {
        window.location.reload(true);
        return ;
      }
      if (res == '-3') {
        ShowMessage('系统错误！');
      } else if (res == '-4') {
        ShowMessage('比赛还没结束，无法统计rating！');
      } else {
        GetRanklist();
        ShowMessage('成功计算了'+res+'个用户的rating！');
      }
      $cal.text('统计rating').removeClass('disabled');
    });
  });
});
