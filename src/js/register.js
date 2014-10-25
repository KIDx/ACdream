var $register = $('#register');
var $regimg = $register.find('#vcode');
var $reginput = $register.find('input');
var $regsubmit = $register.find('#reg_submit');
var $regerr = $register.find('#reg_error');

function getVerifycode() {
  $.ajax({
    type : 'POST',
    url : '/createVerifycode',
    dataType : 'text'
  })
  .done(function(res){
    $regimg.html('<img src="'+res+'">');
  });
}

$(document).ready(function(){
  getVerifycode();
  $regimg.click(getVerifycode);
  
  $regsubmit.click(function(){
    if ($(this).hasClass('disabled')) {
      return false;
    }
    var username = $reginput.eq(0).val();
    if (!username) {
      errAnimate($regerr, 'User Name can NOT be empty!');
      return false;
    }
    if (username.length < 2 || username.length > 15) {
      errAnimate($regerr, 'the length of User Name must be between 2 and 15!');
      return false;
    }
    var pattern = new RegExp("^[a-zA-Z0-9_]{2,15}$");
    if (!pattern.test(username)) {
      errAnimate($regerr, "User Name should ONLY contain digits, letters, or '_'s!");
      return false;
    }
    var password = $reginput.eq(1).val();
    if (!password || password.length < 4) {
      errAnimate($regerr, 'the length of Password can NOT less then 4!');
      return false;
    }
    var repeat = $reginput.eq(2).val();
    if (repeat != password) {
      errAnimate($regerr, 'two Password are NOT the same!');
      return false;
    }
    var nick = JudgeString($reginput.eq(3).val());
    if (!nick) {
      errAnimate($regerr, 'Nick Name can NOT be empty!');
      return false;
    }
    if (nick.length > 20) {
      errAnimate($regerr, 'the length of Nick Name should be no more than 20!');
      return false;
    }
    var school = JudgeString($reginput.eq(4).val());
    if (school.length > 50) {
      errAnimate($regerr, 'the length of School should be no more than 50!');
      return false;
    }
    var email = JudgeString($reginput.eq(5).val());
    if (email) {
      pattern = new RegExp("^([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+@([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+\.[a-zA-Z]{2,4}$");
      if (!pattern.test(email)) {
        errAnimate($regerr, 'the format of Email is NOT true!');
        return false;
      }
    }
    if (email.length > 50) {
      errAnimate($regerr, 'the length of Email should be no more than 50!');
      return false;
    }
    var signature = JudgeString($register.find('textarea').attr('value'));
    if (signature.length > 200) {
      errAnimate($regerr, 'the length of Signature should be no more than 200!');
      return false;
    }
    var vcode = JudgeString($('#reg_vcode').val());
    if (!vcode) {
      errAnimate($regerr, 'Verify Code can NOT be empty!');
      return false;
    }
    showWaitting($regerr);
    $regsubmit.addClass('disabled');
    $.ajax({
      type : 'POST',
      url : '/register',
      dataType : 'text',
      data: {
        username: username,
        password: password,
        nick: nick,
        school: school,
        email: email,
        signature: signature,
        vcode: vcode
      },
      error: function() {
        $regsubmit.removeClass('disabled');
        errAnimate($regerr, '无法连接到服务器！');
      }
    })
    .done(function(res){
      if (!res) {
        window.location.href = '/';
        return ;
      }
      if (res == '1') {
        errAnimate($regerr, '验证码错误!');
      } else if (res == '2') {
        errAnimate($regerr, 'this user already exists!');
      } else {
        errAnimate($regerr, '系统错误！');
      }
      $regsubmit.text('Submit').removeClass('disabled');
    });
  });
  simulateClick($reginput, $regsubmit);
});
