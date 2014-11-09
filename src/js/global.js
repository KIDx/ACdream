/*
 *
 *   Global Variable
 *
 */

function NAN(x) {
  x = parseInt(x, 10);
  return x != x;
}

//使模态对话框居中
$(document).ready(function(){
  $.each($('.jqmSubmit,.CeWindow'), function(){
    $(this).css({'margin-left': -parseFloat($(this).css('width'))/2});
  });
});

function ChangeScrollTop(n) {
  $('html,body').stop().animate({scrollTop: n+'px'}, 500);
}

//go to top button
$(document).ready(function(){
  $('#scroll li a.up').click(function(){
    ChangeScrollTop(0);
  });
  $('#scroll li a.down').click(function(){
    ChangeScrollTop($(document).height());
  });
});

//return status color class
function Col(n) {
  switch(n) {
  case 0:
  case 1: return 'info-text';
  case 2: return 'accept-text';
  case 3:
  case 4:
  case 5:
  case 6:
  case 7:
  case 9:
  case 10:
  case 11:
  case 12:
  case 15: return 'wrong-text';
  default: return 'special-text';
  }
}

//return status result string
function Res(n) {
  switch(n) {
    case 0: return 'Pending...';
    case 1: return 'Running...';
    case 2: return 'Accepted';
    case 3: return 'Presentation Error';
    case 4: return 'Time Limit Exceeded';
    case 5: return 'Memory Limit Exceeded';
    case 6: return 'Wrong Answer';
    case 7: return 'Output Limit Exceeded';
    case 8: return 'Compilation Error';
    case 13: return 'Dangerous Code';
    case 14: return 'System Error';
    default: return 'Runtime Error';
  }
}

//return user color style
function UserCol(n) {
  n = parseInt(n, 10);
  if (!n) return 'unrated';
  if (n >= 2200) {
    return 'red';
  } else if (n >= 1900) {
    return 'orange';
  } else if (n >= 1700) {
    return 'violet';
  } else if (n >= 1500) {
    return 'blue';
  } else if (n >= 1200) {
    return 'green';
  }
  return 'black';
}

//return user title
function UserTitle(n) {
  n = parseInt(n, 10);
  if (!n) return 'Unrated';
  if (n >= 2600) {
    return 'International Grandmaster';
  } else if (n >= 2200) {
    return 'Grandmaster';
  } else if (n >= 2050) {
    return 'International Master';
  } else if (n >= 1900) {
    return 'Master';
  } else if (n >= 1700) {
    return 'Candidate Master';
  } else if (n >= 1500) {
    return 'Expert';
  } else if (n >= 1350) {
    return 'Specialist';
  } else if (n >= 1200) {
    return 'Pupil';
  }
  return 'Newbie';
}

function errAnimate($err, err) {
  $err.text(err);
  $err.stop().stop().hide().fadeIn();
}

function showWaitting($p) {
  $p.html('<img src="/img/waitting.gif">');
}

function simulateClick($input, $btn) {
  $input.keyup(function(e){
    if (e.keyCode == 13) {
      $btn.click();
    }
  });
}

function addZero(n) {
  return (n < 10 ? '0' : '')+n;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

var CE = {};
var $CE;

//show Compilation Error information
function BindCE() {
  var $dialog_ce = $('div#dialog_ce');
  var $text = $dialog_ce.find('#text');
  if ($CE && $CE.length) {
    $CE.unbind();
  }
  $CE = $('a.CE');
  if ($CE.length) {
    $CE.click(function(){
      $dialog_ce.jqm({
        overlay: 30,
        trigger: false,
        modal: false,
        closeClass: 'infoclose',
        onShow: function(h) {
          h.o.fadeIn(200);
          h.w.fadeIn(200);
        },
        onHide: function(h) {
          h.w.fadeOut(200);
          h.o.fadeOut(200);
        }
      }).jqDrag('.jqDrag').jqResize('.jqResize').jqmShow();
      var rid = $(this).attr('rid');
      if (CE[rid]) {
        $text.text(CE[rid]);
        return false;
      }
      $text.html('<img src="/img/waitting.gif">');
      $.ajax({
        type: 'POST',
        url: '/status/CE',
        data: { rid: rid },
        dataType: 'text',
        error: function() {
          $text.text('无法连接到服务器！');
        }
      })
      .done(function(res){
        CE[rid] = res;
        $text.text(res);
      });
    });
  }
}

var $footTime = $('span#timer');
var $contest_current = $('#contest_current');

var $finput = $('input[type="text"], textarea').eq(1);

var $dialog_lg = $('#dialog_lg');
var $logininput = $dialog_lg.find('input');
var $loginerr = $dialog_lg.find('#login_error');
var $loginsubmit = $dialog_lg.find('#login_submit');

var $dialog_lgbtk = $('div#dialog_lgbtk');
var $fast_login = $dialog_lgbtk.find('#fast_login');
var $fast_login_err = $dialog_lgbtk.find('#fast_login_err');

var $checklogin = $('a.checklogin, button.checklogin');

var $logout = $('#logout');

var $sverdict = $('#verdict');

function deal(times) {
  var n = parseInt(times, 10);
  if (n != n) return '';
  var h = addZero(parseInt(n/3600, 10));
  var m = addZero(parseInt(n%3600/60, 10));
  var s = addZero(parseInt(n%3600%60, 10));
  var key = arguments[1] ? arguments[1] : 0;
  if (key == 1) { //onecontest.js-standings
    return (h+':'+m);
  }
  var res;
  if (h >= 24) {
    var day = parseInt(h/24, 10);
    if (day >= 7) {
      var week = parseInt(day/7, 10);
      res = week+' week';
      if (week > 1) res += 's';
    } else {
      res = day+' day';
      if (day > 1) res += 's';
    }
  } else {
    res = h+':'+m+':'+s;
  }
  return res;
}

function CheckEscape(ch) {
  if (ch == '$' || ch == '(' || ch == ')' || ch == '*' || ch == '+' ||
    ch == '.' || ch == '[' || ch == ']' || ch == '?' || ch == '\\' ||
    ch == '^' || ch == '^' || ch == '{' || ch == '}' || ch == '|')
  return true;
  return false;
}

function toEscape(str) {
  var res = '';
  for (var i = 0; i < str.length; i++) {
  if (CheckEscape(str.charAt(i))) res += '\\';
  res += str.charAt(i);
  }
  return res;
}

function trim(s) {
  if (!s) return '';
  return String(s).replace(/(^\s*)|(\s*$)/g, '');
}

function drim(s) {
  if (!s) return '';
  return String(s).replace(/(\s+)/g, ' ');
}

//return a string without no unuseful space
function JudgeString(s) {
  return drim(trim(s));
}

function getDate(s, hasSec) {
  var date = s ? new Date(s) : new Date();
  if (!date) return '';
  var res = date.getFullYear()+'-'+addZero(date.getMonth()+1)+'-'+addZero(date.getDate())+' '+addZero(date.getHours())+':'+addZero(date.getMinutes());
  if (hasSec) res += ':'+addZero(date.getSeconds());
  return res;
}

function SetCurrentTime() {
  current_time = getDate(curren_second, true);
  $footTime.text(current_time);
  if ($contest_current.length) {
    $contest_current.text(current_time);
  }
  curren_second += 1000;
}

var timeout;
function ShowMessage(msg) {
  $msgdialog = $('div#msg-dialog');
  if ($msgdialog.length) $msgdialog.remove();
  $('body').append('<div class="jqmWindow" id="msg-dialog"><span>'+msg
    +'</span><span title="close" class="msgclose jqmClose">×</span></div>');
  $msgdialog = $('div#msg-dialog');
  function Hide() {
    $msgdialog.jqmHide();
  }
  $msgdialog.jqm({
    overlay: 0,
    closeClass: 'msgclose',
    trigger: false,
    onHide: function(h){
      h.w.fadeOut(888);
    },
    onShow: function(h){
      h.w.fadeIn(888, function(){timeout=setTimeout(Hide, 8000);});
    }
  });
  clearTimeout(timeout);
  $msgdialog.jqmShow();
}

function ShowLogin(url) {
  if ($dialog_lg.length) {
    nextURL = url ? url : '';
    if ($dialog_lgbtk.length) {
      $dialog_lgbtk.jqmShow();
    } else {
      $dialog_lg.jqmShow();
    }
    return true;
  } else {
    return false;
  }
}

var $username = $logininput.eq(0);
var $password = $logininput.eq(1);

$(document).ready(function(){
  SetCurrentTime();
  setInterval(SetCurrentTime, 1000);

  //message
  if (globalMessage) {
    ShowMessage(globalMessage);
  }

  function GoToNextURL() {
    if (!nextURL) {
      window.location.reload(true);
    } else {
      window.location.href = nextURL;
      nextURL = '';
    }
  }

  //login_by_token
  if ($dialog_lgbtk.length) {
    $dialog_lgbtk.jqm({
      overlay: 30,
      trigger: false,
      modal: true,
      closeClass: 'login_by_token_close',
      onShow: function(h) {
        h.o.fadeIn(200);
        h.w.fadeIn(200);
      },
      onHide: function(h) {
        h.w.fadeOut(200);
        h.o.fadeOut(200);
      }
    }).jqDrag('.jqDrag');

    function Switch(err) {
      $dialog_lgbtk.jqmHide();
      setTimeout(function(){
        $dialog_lg.jqmShow();
        if (err) {
          errAnimate($loginerr, err);
        }
      }, 300);
    }

    $fast_login.click(function(){
      if ($fast_login.hasClass('disabled')) {
        return false;
      }
      showWaitting($fast_login_err);
      $fast_login.addClass('disabled');
      $.ajax({
        type: 'POST',
        url: '/loginByToken',
        dataType: 'text',
        error: function() {
          $fast_login.removeClass('disabled');
          errAnimate($fast_login_err, '无法连接到服务器！');
        }
      }).done(function(res){
        if (!res) {
          $dialog_lgbtk.jqmHide();
          GoToNextURL();
          return ;
        } else if (res == '1') {
          Switch('登录信息过期，请重新登录！');
        } else if (res == '3') {
          errAnimate($fast_login_err, '系统错误！');
        }
        $fast_login.removeClass('disabled');
      });
    });

    $('#switch').click(function(){
      Switch();
    });
  }

  //login
  if ($dialog_lg.length) {
    $dialog_lg.jqm({
      overlay: 30,
      trigger: false,
      modal: true,
      closeClass: 'loginclose',
      onShow: function(h) {
        h.o.fadeIn(200);
        h.w.fadeIn(200);
      },
      onHide: function(h) {
        h.w.fadeOut(200);
        h.o.fadeOut(200);
      }
    }).jqDrag('.jqDrag').jqResize('.jqResize');

    $loginsubmit.click(function(){
      if ($(this).hasClass('disabled')) {
        return false;
      }
      var name = $username.val();
      if (!name) {
        errAnimate($loginerr, 'the username can not be empty!');
        return ;
      }
      var psw = $password.val();
      if (!psw) {
        errAnimate($loginerr, 'the password can not be empty!');
        return ;
      }
      showWaitting($loginerr);
      $loginsubmit.addClass('disabled');
      $.ajax({
        type : 'POST',
        url : '/login',
        data : {
          username: name,
          password: psw,
          remember: $('#remember').is(':checked')
        },
        dataType : 'text',
        error: function() {
          $loginsubmit.removeClass('disabled');
          errAnimate($loginerr, '无法连接到服务器！');
        }
      })
      .done(function(res){
        if (!res) {
          $dialog_lg.jqmHide();
          GoToNextURL();
          return ;
        } else if (res == '1') {
          errAnimate($loginerr, 'the user is not exist!');
        } else if (res == '2') {
          errAnimate($loginerr, 'username and password do not match!');
        } else if (res == '3') {
          errAnimate($loginerr, '系统错误！');
        }
        $loginsubmit.text('Login').removeClass('disabled');
      });
    });

    simulateClick($logininput, $loginsubmit);
  }

  //logout
  if ($logout.length) {
    $logout.click(function(){
      $.ajax({
        type : 'POST',
        url : '/logout',
        dataType : 'text'
      })
      .done(function(){
        window.location.reload(true);
      });
    });
  }

  //checklogin
  $checklogin.click(function(){
    ShowLogin( $(this).data('url') );
  });
});
