var content;

$(document).ready(function(){
  content = CKEDITOR.replace( 'content' );
});

var $submit = $('#submit');
var $err = $('#err');
var $title = $('#Title');
var $vcode = $('#vcode');
var $vcimg = $('#vcimg');
var tid = parseInt($('#addtopic').attr('tid'), 10);

function getVcode() {
  $.ajax({
    type: 'POST',
    url: '/createVerifycode',
    dataType: 'text'
  }).done(function(res){
    $vcimg.html('<img src="'+res+'">');
  });
}

$(document).ready(function(){
  $vcimg.click(function(){
    getVcode();
  });
});

$(document).ready(function(){
  $submit.click(function(){
    var title = JudgeString($title.val());
    if (!title) {
      errAnimate($err, '标题不能为空！');
      return false;
    }
    if (!JudgeString(content.document.getBody().getText())) {
      errAnimate($err, '内容不能为空！');
      return false;
    }
    if ($vcode.length) {
      if (!$vcode.val()) {
        errAnimate($err, '验证码不能为空！');
        return false;
      }
    }
    if ($submit.hasClass('disabled')) {
      return false;
    }
    $submit.addClass('disabled');
    var data = {title:title, content:content.getData()};
    if (tid) {
      data.tid = tid;
    } else {
      data.vcode = $vcode.val();
    }
    $.ajax({
      type: 'POST',
      url: '/addtopic',
      data: data,
      dataType: 'text',
      error: function() {
        $submit.removeClass('disabled');
        errAnimate($err, '连接服务器失败！');
      }
    }).done(function(res){
      if (res == '1') {
        errAnimate($err, '验证码错误！');
      } else if (res == '2') {
        errAnimate($err, '系统错误！');
      } else {
        window.location.href = '/topic?tid='+res;
        return ;
      }
      $submit.removeClass('disabled');
    });
  });
  simulateClick($vcode, $submit);
  simulateClick($title, $submit);
});
