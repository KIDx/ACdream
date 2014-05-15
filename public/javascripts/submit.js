var $submit = $('#submit')
,   $err = $('#error')
,   $alert = $('#alert');

function U(err) {
    $err.text(err);
    window.location.href = document.URL.split('#')[0]+'#';
}

$(document).ready(function(){
    $submit.click(function(){
        if ($submit.hasClass('disabled')) {
            return false;
        }
        var  code = String($('#code').val()), pid = $('#pid').val(), lang = $('#lang').val();
        if (code.length < 50 || code.length > 65536) {
            U('the length of code must be between 50B and 65536B!');
            return false;
        }
        if (lang < 3 && code.indexOf('%I64') >= 0 && $alert.is(':hidden')) {
            $alert.slideDown();
            return false;
        }
        $submit.text('Submitting...').addClass('disabled');
        $.ajax({
            type : 'POST',
            url : '/submit',
            data : {
                pid: pid,
                code: code,
                lang: lang
            },
            dataType : 'text',
            error: function() {
                $submit.text('Submit').removeClass('disabled');
                U('无法连接到服务器！');
            }
        })
        .done(function(res){
            if (res == '3') {
                U('系统错误！');
            } else if (res == '4') {
                U('The problem is not exist!');
            } else if (res == '5') {
                U('The language is not exit!');
            } else {
                window.location.href = '/status';
                return ;
            }
            $submit.text('Submit').removeClass('disabled');
        });
    });
});