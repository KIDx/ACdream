var $createprob = $('#createprob');
var $createprob_err = $createprob.find('#err');
var $createprob_submit = $createprob.find('#submit');

$(document).ready(function(){
  $createprob_submit.click(function(){
    if ($createprob_submit.attr('disabled')) {
      return false;
    }
    var cnt = $createprob.find('#cnt').val();
    var manager = JudgeString($createprob.find('#manager').val());
    var source = JudgeString($createprob.find('#source').val());
    if (!manager) {
      errAnimate($createprob_err, 'user name can NOT be empty.');
      return false;
    }
    if (!source) {
      errAnimate($createprob_err, 'source can NOT be empty.');
      return false;
    }
    $createprob_submit.attr('disabled', true);
    showWaitting($createprob_err);
    $.ajax({
      type: 'POST',
      url: '/admin/batchcreateprob',
      data: {
        cnt: cnt,
        manager: manager,
        source: source
      },
      dataType: 'json',
      error: function() {
        $createprob_submit.attr('disabled', false);
        errAnimate($createprob_err, '无法连接到服务器！');
      }
    }).done(function(res){
      if (res.ret === 0) {
        window.location.href = '/problem/list?start='+res.id+'&end='+(res.id+cnt-1);
      } else {
        $createprob_submit.attr('disabled', false);
        errAnimate($createprob_err, res.msg);
      }
    });
  });
});

var $marquee = $('#marquee');
var $marquee_save = $marquee.find('#save');
var $marquee_err = $marquee.find('#err');

$(document).ready(function(){
  $marquee.find('.trash').click(function(){
    $(this).parent().parent().parent().remove();
  });
  $marquee.find('#add').click(function(){
    $marquee_err.removeClass('success-text').addClass('error-text');
    if ($marquee.find('input').length >= 10) {
      errAnimate($marquee_err, '最多只能有10个');
      return false;
    }
    var $clone = $(this).parent().prev().clone(true);
    $clone.find('input').val('');
    $(this).parent().before($clone);
    $clone.find('input').focus();
  });
  $marquee_save.click(function(){
    if ($marquee_save.attr('disabled')) {
      return false;
    }
    $marquee_err.removeClass('success-text').addClass('error-text');
    var marqueeList = [];
    var $input = $marquee.find('input');
    for (var i = 0; i < $input.length; ++i) {
      if (!$input.eq(i).val()) {
        errAnimate($marquee_err, "存在空的非法项");
        return false;
      }
      marqueeList.push($input.eq(i).val());
    }
    $marquee_save.attr('disabled', true);
    showWaitting($marquee_err);
    $.ajax({
      type: 'POST',
      url: '/admin/setmarquee',
      data: {json: JSON.stringify(marqueeList)},
      dataType: 'json',
      error: function() {
        $marquee_save.attr('disabled', false);
        errAnimate($marquee_err, '无法连接到服务器！');
      }
    }).done(function(res){
      if (res.ret === 0) {
        $marquee_err.removeClass('error-text').addClass('success-text');
      }
      $marquee_save.attr('disabled', false);
      errAnimate($marquee_err, res.msg);
    });
  });
});

var $recal = $('#recal');
var $recal_err = $recal.find('#err');
var $recal_start = $recal.find('#start');

$(document).ready(function(){
  $recal_start.click(function(){
    if ($recal_start.attr('disabled') || !confirm('计算过程中会增加cpu负载，确认要继续吗？')) {
      return false;
    }
    $recal_start.attr('disabled', true);
    showWaitting($recal_err);
    $.ajax({
      type: 'POST',
      url: '/admin/stat',
      dataType: 'json',
      error: function() {
        $recal_start.attr('disabled', false);
        errAnimate($recal_err, '无法连接到服务器！');
      }
    }).done(function(res){
      if (res.ret === 0) {
        window.location.href = '/ranklist';
      } else {
        $recal_start.attr('disabled', false);
        errAnimate($recal_err, res.msg);
      }
    });
  });
});
