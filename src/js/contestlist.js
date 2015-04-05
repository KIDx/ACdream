
var $fil = $('#fil');
var $search = $('#search');
var $list = $('#list').find('a');
var base_url = '/contest/list?type='+contest_type;

function go(page){
  var F = new Array(), G = new Array();
  var search = JudgeString($search.val());

  if (page) F.push('page'), G.push(page);
  if (search) F.push('search'), G.push(search);
  var url = base_url, flg = true;
  for (var i = 0; i < F.length; i++) {
    url += '&' + F[i] + '=' + G[i];
  }

  window.location.href = url;
}

$(document).ready(function(){
  if (contest_type === 2) {
    base_url += '&family=' + contest_family;
  }
  $fil.click(function(){
    go(null);
  });
  $.each($list, function(i, p){
    $(p).click(function(){
      var $li = $(this).parent();
      if ($li.hasClass('active') || $li.hasClass('disabled')) {
        return false;
      }
      go($(this).attr('id'));
    });
  });
  simulateClick($search, $fil);
});

var $register = $('a.register');
var passTime = 0, timer, interval;

function Timer() {
  $.each($register, function(){
    var cid = $(this).attr('id');
    var tp = $(this).attr('left') - passTime;
    if (tp <= 0) {
      clearInterval(interval);
      $(this).parent().html('<span class="user-gray">Registration Closed</span>');
    } else {
      var $pre = $(this).prev();
      if ($pre.text() != deal(tp)) {
        $pre.text(deal(tp));
      }
    }
  });
  ++passTime;
}

$(document).ready(function(){
  if ($register.length) {
    Timer();
    interval = setInterval(Timer, 1000);
    $.each($register, function(){
      $(this).click(function(){
        if ($(this).hasClass('disabled')) {
          return false;
        }
        if (ShowLogin()) {
          return false;
        }
        var $clickreg = $(this);
        var cid = parseInt($clickreg.attr('id'));
        $clickreg.addClass('disabled');
        $.ajax({
          type: 'POST',
          url: '/contest/register',
          data: {cid: cid},
          dataType: 'json',
          error: function() {
            $clickreg.removeClass('disabled');
            ShowMessage('无法连接到服务器！');
          }
        }).done(function(res){
          var ret = res.ret;
          if (ret === 0) {
            window.location.reload(true);
          } else {
            $clickreg.removeClass('disabled');
            ShowMessage(res.msg);
          }
        });
      });
    });
  }
});

var $dialog_lc = $('div#dialog_lc');
var $psw = $dialog_lc.find('#contest_password');
var $submit = $dialog_lc.find('#contest_submit');
var $err = $dialog_lc.find('#contest_error');
var $cid = $('a.cid');

$(document).ready(function(){
  if ($cid.length) {
    $.each($cid, function(){
      $(this).click(function(){
        var cid = $(this).attr('id');
        $dialog_lc.jqmShow();
        $submit.unbind();
        $psw.unbind();
        $submit.click(function(){
          if ($(this).hasClass('disabled')) {
            return false;
          }
          if (!$psw.val()) {
            errAnimate($err, 'the password can not be empty!');
            return false;
          }
          showWaitting($err);
          $submit.addClass('disabled');
          $.ajax({
            type: 'POST',
            url: '/contest/login',
            data: {
              cid: cid,
              psw: $psw.val()
            },
            dataType: 'json',
            error: function() {
              $submit.removeClass('disabled');
              errAnimate($err, '无法连接到服务器！');
            }
          }).done(function(res){
            var ret = res.ret;
            if (ret == 0) {
              window.location.href = '/contest?cid='+cid;
            } else {
              $submit.removeClass('disabled');
              errAnimate($err, res.msg);
            }
          });
        });
        simulateClick($psw, $submit);
      });
    });
  }
});

$(document).ready(function(){
  if ($dialog_lc.length > 0) {
    $dialog_lc.jqm({
      overlay: 30,
      trigger: false,
      modal: true,
      closeClass: 'contestclose',
      onShow: function(h){
        h.o.fadeIn(200);
        h.w.fadeIn(200);
      },
      onHide: function(h){
        h.w.fadeOut(200);
        h.o.fadeOut(200);
      }
    }).jqDrag('.jqDrag').jqResize('.jqResize');
  }
});
