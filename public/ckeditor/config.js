/**
 * @license Copyright (c) 2003-2013, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or http://ckeditor.com/license
 */

CKEDITOR.editorConfig = function( config ) {
	// Define changes to default configuration here.
	// For the complete reference:
	// http://docs.ckeditor.com/#!/api/CKEDITOR.config

	// The toolbar groups arrangement, optimized for two toolbar rows.
	config.language = 'zh-cn';
	config.forcePasteAsPlainText = true;
	config.allowedContent = true;
	config.autoParagraph = false;
	config.contentsCss = ['../bootstrap/bootstrap.css', CKEDITOR.basePath+'contents.css'];

	config.toolbar = [
		{ name: 'document', items: [ 'Source' ] },
		{ name: 'clipboard', items : [ 'Undo','-','Redo' ] },
		{ name: 'paragraph', items : [ 'NumberedList','BulletedList','-','Outdent','Indent','-','Blockquote','-','JustifyLeft','JustifyCenter','JustifyRight','JustifyBlock']},
		{ name: 'insert', items: [ 'Image','Table','HorizontalRule','SpecialChar' ] },
		'/',
		{ name: 'styles', items : [ 'Format','FontSize', 'Subscript', '-', 'Superscript' ] },
		{ name:'colors', items : [ 'TextColor' ] },
		{ name: 'links', items : [ 'Link','Unlink','Anchor' ] },
		{ name: 'about', items: [ 'About' ] },
		'/',
		{ name: 'basicstyles', items : [ 'Bold','-','Italic','-','RemoveFormat' ] },
		{ name: 'tools', items: [ 'InsertCode','-','Smiley','-','Maximize' ] }
	];

	config.extraPlugins = 'insertcode,smiley';

	//表情显示每行个数
	config.smiley_columns = 10;
	//表情自定义
	config.smiley_descriptions = [];
	var imgs = new Array();
	for (var i = 1; i <= 10; i++) {
		imgs.push('n'+i+'.gif');
	}
	for (var i = 1; i <= 67; i++) {
		imgs.push(i+'.gif');
	}
	config.smiley_images = imgs;

	// Remove some buttons, provided by the standard plugins, which we don't
	// need to have in the Standard(s) toolbar.
	config.removeButtons = 'Underline';

	// Se the most common block elements.
	config.format_tags = 'p;h1;h2;h3;pre';

	// Make dialogs simpler.
	config.removeDialogTabs = 'image:advanced;link:advanced';
};
