
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
      if (res === '3') {
        ShowMessage('系统错误！');
        return ;
      }
      window.location.reload(true);
    });
  });
});

var $edits;
var $trashs;
var $replys;
var $editbox;
var $edit_submit;
var $replybox;
var $reply_submit;
var edit_content;
var reply_content;

function build(s) {
  return '<div id="'+s+'box" style="display:none;">'
    + '<textarea id="'+s+'_content"></textarea><div>'
    + '<a class="btn btn-default" href="javascript:;" style="margin-top:5px;" id="' + s
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
        ShowMessage('修改成功！');
        $content_tag.html( edit_content.getData() );
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

var tmp_content;
var $content_tag;
function BindActions() {
  $edits = $('a.edit-btn');
  $trashs = $('a.trash-btn');
  $replys = $('a.reply-btn');

  $replys.unbind();
  $replys.click(function(){
    if ($replybox && $replybox.length) {
      var id = $replybox.prev().prev().attr('id');
      $reply_submit.unbind();
      CKEDITOR.remove( reply_content );
      $replybox.remove();
      $replybox = null;
      if ($(this).data('id') == id) {
        return false;
      }
    }
    $(this).parent().parent().next().after(build('reply'));
    $replybox = $('#replybox');
    $reply_submit = $('#reply_submit');
    reply_content = CKEDITOR.replace( 'reply_content' );
    bindReply($(this).data('fa'), $(this).data('at'));
    $replybox.show();
  });

  $edits.unbind();
  $edits.click(function(){
    var $edit = $(this);
    var comment_id = $edit.data('id');
    if ($editbox && $editbox.length && $content_tag) {
      $edit_submit.unbind();
      CKEDITOR.remove( edit_content );
      $editbox.remove();
      $editbox = null;
      $content_tag.html(tmp_content);
      if (comment_id == $content_tag.prev().attr('id')) {
        return false;
      }
    }
    $content_tag = $edit.parent().parent().next();
    tmp_content = $content_tag.html();
    $content_tag.html(build('edit'));
    $editbox = $('#editbox');
    $edit_submit = $('#edit_submit');
    edit_content = CKEDITOR.replace( 'edit_content' );
    edit_content.setData(tmp_content);
    bindEdit(comment_id);
    $editbox.show();
  });

  $trashs.unbind();
  $trashs.click(function(){
    if (!confirm('确认要删除此回复吗？')) {
      return false;
    }
    var $p = $(this);
    $.ajax({
      type: 'POST',
      url: '/comment/del',
      data: {
        id: $p.data('id')
      },
      dataType: 'text',
      error: function() {
        ShowMessage('无法连接到服务器！');
      }
    }).done(function(res){
      if (!res) {
        $p.parent().parent().parent().parent().remove();
        ShowMessage('删除成功！');
      } else if (res == '3') {
        ShowMessage('系统错误！');
      }
    });
  });
}

$(document).ready(function(){
  BindActions();
});


var $toggleTop = $('#toggle_top');

$(document).ready(function(){
  if ($toggleTop.length) {
    $toggleTop.click(function(){
      $.ajax({
        type: 'POST',
        url: '/topic/toggleTop',
        data: { tid: _tid },
        dataType: 'json',
        error: function() {
          ShowMessage('无法连接到服务器！');
        }
      }).done(function(res){
        var ret = res.ret;
        if (ret === 0) {
          window.location.reload(true);
        } else {
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
  function BuildActions(p) {
    var html = '';
    if (current_user) {
      html += '<span class="actions pull-right">';
      if (current_user === 'admin' || current_user === p.user) {
        html += '<a data-id="'+p.id+'" class="img_link edit edit-btn" href="javascript:;" title="编辑"></a>';
        html += '<a data-id="'+p.id+'" class="img_link trash trash-btn" href="javascript:;" title="删除"></a>';
      }
      html += '<a data-id="'+p.id+'" data-fa="'+(p.fa === -1 ? p.id : p.fa)+'" data-at="'+p.user+'" class="img_link reply reply-btn" href="javascript:;" title="回复"></a>';
      html += '</span>';
    }
    return html;
  }
  function BuildReply(p, i) {
    var html = '<div class="reply_box" id="'+p.id+'"'
    if (i === 0) {
      html += ' style="border-top:0;"';
    }
    html += '><div class="rl">';
    html += '<img alt="avatar"  src="'+GetImgSrc(p.user)+'" class="img-60 img-round">';
    html += '</div>';
    html += '<div class="rr">';
    html += '<div class="head" id="'+p.id+'">';
    html += '<a href="javascript:;" title="'+UT[p.user]+'" class="user user-'+UC[p.user]+'">'+p.user+'</a>';
    html += ' <span class="user-gray">@'+p.at+' '+p.inDate+'</span>';
    html += BuildActions(p);
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
    html += BuildActions(p);
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
        var ret = res.ret;
        if (ret === 0) {
          Render(res.data);
          BindActions();
        } else {
          ShowMessage('系统错误！');
        }
      });
    });
  }
});

var $addreply = $('#add_reply');
var $toreply = $('#to_reply');

$(document).ready(function(){
  if ($addreply.length) {
    $addreply.click(function(){
      $toreply.toggle();
    });
  }
});
