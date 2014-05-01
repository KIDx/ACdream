
var $content = $('#content')
,	content;

$(document).ready(function(){
	if ($content.length) {
		content = CKEDITOR.replace( 'content' );
	}
});

var $reply = $('#reply')
,	$err = $('#err')
,	tid = parseInt($('#onetopic').attr('tid'), 10);

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
			type : 'POST',
			url : '/review',
			data : {
				tid : tid,
				content : content.getData(),
				fa : -1
			},
			dataType : 'text',
			error: function() {
				$reply.removeClass('disabled');
				errAnimate($err, '无法连接到服务器！');
			}
		})
		.done(function(res){
			window.location.reload(true);
		});
	});
});

var $replys = $('.reply')
,	$replybox
,	$con_err
,	$submit
,	con;

var html = '<div id="replybox" class="hide cb"><textarea id="con"></textarea>'
+ '<div><a class="uibtn" href="javascript:;" id="submit">提交</a>'
+ '<span class="error-text" id="con_err"></span></div></div>';

function bind(fa, at) {
	$submit.click(function(){
		if ($(this).hasClass('disabled')) {
			return false;
		}
		if (!JudgeString(con.document.getBody().getText())) {
			errAnimate($con_err, '内容不能为空！');
			$(this).removeClass('disabled');
			return false;
		}
		$submit.addClass('disabled');
		$.ajax({
			type : 'POST',
			url : '/review',
			data : {
				tid : tid,
				content : con.getData(),
				fa: fa,
				at: at
			},
			dataType : 'text',
			error: function() {
				$submit.removeClass('disabled');
				errAnimate($con_err, '无法连接到服务器！');
			}
		})
		.done(function(){
			window.location.reload(true);
		});
	});
}

$(document).ready(function(){
	if ($reply.length) {
		$.each($replys, function(i, p){
			$(p).click(function(){
				if ($replybox && $replybox.length) {
					$submit.unbind();
					CKEDITOR.remove( con );
					$replybox.remove();
				}
				$(this).after(html);
				$replybox = $('#replybox');
				$con_err = $('#con_err');
				$submit = $('#submit');
				bind($(this).attr('fa'), $(this).attr('at'));
				btnAnimate($submit);
				con = CKEDITOR.replace( 'con' );
				$replybox.show();
			});
		});
	}
});