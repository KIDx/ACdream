
var $content = $('#content');
var content;

$(document).ready(function(){
  if ($content.length) {
    content = CKEDITOR.replace( 'content' );
  }
});

var $reply = $('#reply');
var $err = $('#err');

$(document).ready(function(){
  $reply.click(function(){
    if ($(this).hasClass('disabled')) {
      return false;
    }
    if (!JudgeString(content.document.getBody().getText())) {
      errAnimate($err, '内容不能为空！');
      $(this).removeClass('disabled');
      return false;
    }
    $reply.addClass('disabled');
    $.ajax({
      type: 'POST',
      url: '/comment/add',
      data: {
        tid: _tid,
        content: content.getData(),
        fa: -1
      },
      dataType: 'text',
      error: function() {
        $reply.removeClass('disabled');
        errAnimate($err, '无法连接到服务器！');
      }
    }).done(function(res){
      window.location.reload(true);
    });
  });
});

var $edits = $('a.edit');
var $trashs = $('a.trash');
var $replys = $('a.reply');
var $editbox;
var $edit_submit;
var $replybox;
var $reply_submit;
var edit_content;
var reply_content;

function build(s) {
  return '<div id="'+s+'box" style="margin-top:5px;" class="hide cb">'
    + '<textarea id="'+s+'_content"></textarea><div>'
    + '<a class="uibtn" href="javascript:;" style="margin:5px 0;" id="' + s
    + '_submit">提交</a></div>';
}

function bind($submit, ct, cb) {
  $submit.click(function(){
    if ($(this).hasClass('disabled')) {
      return false;
    }
    if (!JudgeString(ct.document.getBody().getText())) {
      ShowMessage('内容不能为空！');
      $submit.removeClass('disabled');
      return false;
    }
    $submit.addClass('disabled');
    return cb();
  });
}

function bindEdit(id) {
  bind($edit_submit, edit_content, function(){
    $.ajax({
      type: 'POST',
      url: '/comment/edit',
      data: {
        id: id,
        content: edit_content.getData()
      },
      dataType: 'text',
      error: function() {
        $edit_submit.removeClass('disabled');
        ShowMessage('无法连接到服务器！');
      }
    }).done(function(res){
      if (!res) {
        window.location.reload(true);
        return ;
      } else if (res == '3') {
        ShowMessage('系统错误！');
      }
      $edit_submit.removeClass('disabled');
    });
  });
}

function bindReply(fa, at) {
  bind($reply_submit, reply_content, function(){
    $.ajax({
      type: 'POST',
      url: '/comment/add',
      data: {
        tid: _tid,
        content: reply_content.getData(),
        fa: fa,
        at: at
      },
      dataType: 'text',
      error: function() {
        $reply_submit.removeClass('disabled');
        ShowMessage('无法连接到服务器！');
      }
    }).done(function(res){
      if (!res) {
        window.location.reload(true);
        return ;
      } else if (res == '3') {
        ShowMessage('系统错误！');
      }
      $reply_submit.removeClass('disabled');
    });
  });
}

$(document).ready(function(){
  if ($replys.length) {
    $replys.click(function(){
      if ($replybox && $replybox.length) {
        $reply_submit.unbind();
        CKEDITOR.remove( reply_content );
        $replybox.remove();
        $replybox = null;
        return false;
      }
      $(this).parent().after(build('reply'));
      $replybox = $('#replybox');
      $reply_submit = $('#reply_submit');
      btnAnimate($reply_submit);
      reply_content = CKEDITOR.replace( 'reply_content' );
      bindReply($(this).attr('fa'), $(this).attr('at'));
      $replybox.show();
    });
  }
});

$(document).ready(function(){
  if ($edits.length) {
    var tmp;
    $edits.click(function(){
      var $edit = $(this);
      var $p = $edit.parent().prev();
      if ($editbox && $editbox.length) {
        $edit_submit.unbind();
        CKEDITOR.remove( edit_content );
        $editbox.remove();
        $editbox = null;
        $p.html(tmp);
        return false;
      }
      tmp = $p.html();
      $p.html(build('edit'));
      $editbox = $('#editbox');
      $edit_submit = $('#edit_submit');
      btnAnimate($edit_submit);
      edit_content = CKEDITOR.replace( 'edit_content' );
      edit_content.setData(tmp);
      bindEdit($(this).attr('data-id'));
      $editbox.show();
    });
  }
});

$(document).ready(function(){
  if ($trashs.length) {
    $trashs.click(function(){
      if (!confirm('确认要删除此回复吗？')) {
        return false;
      }
      $.ajax({
        type: 'POST',
        url: '/comment/del',
        data: {
          id: $(this).attr('data-id')
        },
        dataType: 'text',
        error: function() {
          ShowMessage('无法连接到服务器！');
        }
      }).done(function(res){
        if (!res) {
          window.location.reload(true);
        } else if (res == '3') {
          ShowMessage('系统错误！');
        }
      });
    });
  }
});

var $add = $('.add');

$(document).ready(function(){
  if ($add.length) {
    bindAdd($add);
  }
});

var $toggleTop = $('#toggle_top');

$(document).ready(function(){
  if ($toggleTop.length) {
    $toggleTop.click(function(){
      $.ajax({
        type: 'POST',
        url: '/topic/toggleTop',
        data: { tid: _tid },
        dataType: 'text',
        error: function() {
          ShowMessage('无法连接到服务器！');
        }
      }).done(function(res){
        if (!res) {
          window.location.reload(true);
        } else if (res == '3') {
          ShowMessage('系统错误！');
        }
      });
    });
  }
});

var $getMore = $('#get_more');
var $tbody = $('#comment').find('tbody');

function Render(o) {
  var comments = o.comments ? o.comments : [];
  var sub = o.sub ? o.sub : {};
  var UT = o.UT ? o.UT : {};
  var UC = o.UC ? o.UC : {};
  var IT = o.IT ? o.IT : {};
  function GetImgSrc(u) {
    return IT[u] ? '/img/avatar/'+u+'/2.'+IT[u] : '/img/avatar/%3Ddefault%3D/2.jpeg';
  }
  function BuildReply(p, i) {
    var html = '<div class="reply" id="'+p.id+'"'
    if (i === 0) {
      html += ' style="border-top:0;"';
    }
    html += '><div class="rl">';
    html += '<img alt="avatar"  src="'+GetImgSrc(p.user)+'" class="img-60 img-round">';
    html += '</div>';
    html += '<div class="rr">';
    html += '<div class="head">';
    html += '<a href="javascript:;" title="'+UT[p.user]+'" class="user user-'+UC[p.user]+'">'+p.user+'</a>';
    html += ' <span class="user-gray">@'+p.at+' '+p.inDate+'</span>';
    html += '</div>';
    html += '<div class="content">'+p.content+'</div>';
    html += '</div>';
    html += '</div>';
    return html;
  }
  function BuildComment(p) {
    var html = '<tr><td class="cl">';
    html += '<div>';
    html += '<a href="/user/'+p.user+'" title="'+UT[p.user]+'" class="user user-'+UC[p.user]+'">'+p.user+'</a>';
    html += '</div>';
    html += '<div>';
    html += '<img alt="avatar" src="'+GetImgSrc(p.user)+'" class="img-80 img-round">';
    html += '</div>';
    html += '</td>';
    html += '<td class="cr">';
    html += '<div class="head" id="'+p.id+'">';
    html += '<span class="user-gray">评论于'+p.inDate+'</span>';
    html += '</div>';
    html += '<div class="content">'+p.content+'</div>';
    html += '<div class="replies">';
    if (sub[p.id]) {
      html += $.map(sub[p.id], BuildReply).join('');
    }
    html += '</div>';
    html += '</td></tr>';
    return html;
  }
  $tbody.append( $.map(comments, BuildComment).join('') );
  if (comments.length) {
    _min_id = comments[comments.length - 1].id;
  }
  if (!o.haveMore) {
    $getMore.parent().html('<span class="user-gray">没有更多评论</span>');
  }
}

$(document).ready(function(){
  if ($getMore.length) {
    $getMore.click(function(){
      if ($(this).hasClass('hide')) {
        return false;
      }
      $(this).addClass('hide');
      $('#processing').show();
      $.ajax({
        type: 'POST',
        url: '/topic/getComments',
        data: { tid: _tid, min_id: _min_id },
        dataType: 'json',
        error: function() {
          $('#processing').hide();
          $getMore.removeClass('hide');
          ShowMessage('无法连接到服务器！');
        }
      }).done(function(res){
        $('#processing').hide();
        $getMore.removeClass('hide');
        if (res) {
          if (res === '3') {
            ShowMessage('系统错误！');
          } else {
            Render(res);
          }
        }
      });
    });
  }
});

