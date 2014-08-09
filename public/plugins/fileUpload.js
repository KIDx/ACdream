/*!
 * jQuery UI Widget 1.10.3+amd
 * https://github.com/blueimp/jQuery-File-Upload
 *
 * Copyright 2013 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 *
 * http://api.jqueryui.com/jQuery.widget/
 */
(function(a){if(typeof define==="function"&&define.amd){define(["jquery"],a);}else{a(jQuery);}}(function(b,e){var a=0,d=Array.prototype.slice,c=b.cleanData;b.cleanData=function(f){for(var g=0,h;(h=f[g])!=null;g++){try{b(h).triggerHandler("remove");}catch(j){}}c(f);};b.widget=function(f,g,n){var k,l,i,m,h={},j=f.split(".")[0];f=f.split(".")[1];k=j+"-"+f;if(!n){n=g;g=b.Widget;}b.expr[":"][k.toLowerCase()]=function(o){return !!b.data(o,k);};b[j]=b[j]||{};l=b[j][f];i=b[j][f]=function(o,p){if(!this._createWidget){return new i(o,p);}if(arguments.length){this._createWidget(o,p);}};b.extend(i,l,{version:n.version,_proto:b.extend({},n),_childConstructors:[]});m=new g();m.options=b.widget.extend({},m.options);b.each(n,function(p,o){if(!b.isFunction(o)){h[p]=o;return;}h[p]=(function(){var q=function(){return g.prototype[p].apply(this,arguments);},r=function(s){return g.prototype[p].apply(this,s);};return function(){var u=this._super,s=this._superApply,t;this._super=q;this._superApply=r;t=o.apply(this,arguments);this._super=u;this._superApply=s;return t;};})();});i.prototype=b.widget.extend(m,{widgetEventPrefix:l?m.widgetEventPrefix:f},h,{constructor:i,namespace:j,widgetName:f,widgetFullName:k});if(l){b.each(l._childConstructors,function(p,q){var o=q.prototype;b.widget(o.namespace+"."+o.widgetName,i,q._proto);});delete l._childConstructors;}else{g._childConstructors.push(i);}b.widget.bridge(f,i);};b.widget.extend=function(k){var g=d.call(arguments,1),j=0,f=g.length,h,i;for(;j<f;j++){for(h in g[j]){i=g[j][h];if(g[j].hasOwnProperty(h)&&i!==e){if(b.isPlainObject(i)){k[h]=b.isPlainObject(k[h])?b.widget.extend({},k[h],i):b.widget.extend({},i);}else{k[h]=i;}}}}return k;};b.widget.bridge=function(g,f){var h=f.prototype.widgetFullName||g;b.fn[g]=function(k){var i=typeof k==="string",j=d.call(arguments,1),l=this;k=!i&&j.length?b.widget.extend.apply(null,[k].concat(j)):k;if(i){this.each(function(){var n,m=b.data(this,h);if(!m){return b.error("cannot call methods on "+g+" prior to initialization; attempted to call method '"+k+"'");}if(!b.isFunction(m[k])||k.charAt(0)==="_"){return b.error("no such method '"+k+"' for "+g+" widget instance");}n=m[k].apply(m,j);if(n!==m&&n!==e){l=n&&n.jquery?l.pushStack(n.get()):n;return false;}});}else{this.each(function(){var m=b.data(this,h);if(m){m.option(k||{})._init();}else{b.data(this,h,new f(k,this));}});}return l;};};b.Widget=function(){};b.Widget._childConstructors=[];b.Widget.prototype={widgetName:"widget",widgetEventPrefix:"",defaultElement:"<div>",options:{disabled:false,create:null},_createWidget:function(f,g){g=b(g||this.defaultElement||this)[0];this.element=b(g);this.uuid=a++;this.eventNamespace="."+this.widgetName+this.uuid;this.options=b.widget.extend({},this.options,this._getCreateOptions(),f);this.bindings=b();this.hoverable=b();this.focusable=b();if(g!==this){b.data(g,this.widgetFullName,this);this._on(true,this.element,{remove:function(h){if(h.target===g){this.destroy();}}});this.document=b(g.style?g.ownerDocument:g.document||g);this.window=b(this.document[0].defaultView||this.document[0].parentWindow);}this._create();this._trigger("create",null,this._getCreateEventData());this._init();},_getCreateOptions:b.noop,_getCreateEventData:b.noop,_create:b.noop,_init:b.noop,destroy:function(){this._destroy();this.element.unbind(this.eventNamespace).removeData(this.widgetName).removeData(this.widgetFullName).removeData(b.camelCase(this.widgetFullName));this.widget().unbind(this.eventNamespace).removeAttr("aria-disabled").removeClass(this.widgetFullName+"-disabled ui-state-disabled");this.bindings.unbind(this.eventNamespace);this.hoverable.removeClass("ui-state-hover");this.focusable.removeClass("ui-state-focus");},_destroy:b.noop,widget:function(){return this.element;},option:function(j,k){var f=j,l,h,g;if(arguments.length===0){return b.widget.extend({},this.options);}if(typeof j==="string"){f={};l=j.split(".");j=l.shift();if(l.length){h=f[j]=b.widget.extend({},this.options[j]);for(g=0;g<l.length-1;g++){h[l[g]]=h[l[g]]||{};h=h[l[g]];}j=l.pop();if(k===e){return h[j]===e?null:h[j];}h[j]=k;}else{if(k===e){return this.options[j]===e?null:this.options[j];}f[j]=k;}}this._setOptions(f);return this;},_setOptions:function(f){var g;for(g in f){this._setOption(g,f[g]);}return this;},_setOption:function(f,g){this.options[f]=g;if(f==="disabled"){this.widget().toggleClass(this.widgetFullName+"-disabled ui-state-disabled",!!g).attr("aria-disabled",g);this.hoverable.removeClass("ui-state-hover");this.focusable.removeClass("ui-state-focus");}return this;},enable:function(){return this._setOption("disabled",false);},disable:function(){return this._setOption("disabled",true);},_on:function(i,h,g){var j,f=this;if(typeof i!=="boolean"){g=h;h=i;i=false;}if(!g){g=h;h=this.element;j=this.widget();}else{h=j=b(h);this.bindings=this.bindings.add(h);}b.each(g,function(p,o){function m(){if(!i&&(f.options.disabled===true||b(this).hasClass("ui-state-disabled"))){return;}return(typeof o==="string"?f[o]:o).apply(f,arguments);}if(typeof o!=="string"){m.guid=o.guid=o.guid||m.guid||b.guid++;}var n=p.match(/^(\w+)\s*(.*)$/),l=n[1]+f.eventNamespace,k=n[2];if(k){j.delegate(k,l,m);}else{h.bind(l,m);}});},_off:function(g,f){f=(f||"").split(" ").join(this.eventNamespace+" ")+this.eventNamespace;g.unbind(f).undelegate(f);},_delay:function(i,h){function g(){return(typeof i==="string"?f[i]:i).apply(f,arguments);}var f=this;return setTimeout(g,h||0);},_hoverable:function(f){this.hoverable=this.hoverable.add(f);this._on(f,{mouseenter:function(g){b(g.currentTarget).addClass("ui-state-hover");},mouseleave:function(g){b(g.currentTarget).removeClass("ui-state-hover");}});},_focusable:function(f){this.focusable=this.focusable.add(f);this._on(f,{focusin:function(g){b(g.currentTarget).addClass("ui-state-focus");},focusout:function(g){b(g.currentTarget).removeClass("ui-state-focus");}});},_trigger:function(f,g,h){var k,j,i=this.options[f];h=h||{};g=b.Event(g);g.type=(f===this.widgetEventPrefix?f:this.widgetEventPrefix+f).toLowerCase();g.target=this.element[0];j=g.originalEvent;if(j){for(k in j){if(!(k in g)){g[k]=j[k];}}}this.element.trigger(g,h);return !(b.isFunction(i)&&i.apply(this.element[0],[g].concat(h))===false||g.isDefaultPrevented());}};b.each({show:"fadeIn",hide:"fadeOut"},function(g,f){b.Widget.prototype["_"+g]=function(j,i,l){if(typeof i==="string"){i={effect:i};}var k,h=!i?g:i===true||typeof i==="number"?f:i.effect||f;i=i||{};if(typeof i==="number"){i={duration:i};}k=!b.isEmptyObject(i);i.complete=l;if(i.delay){j.delay(i.delay);}if(k&&b.effects&&b.effects.effect[h]){j[g](i);}else{if(h!==g&&j[h]){j[h](i.duration,i.easing,l);}else{j.queue(function(m){b(this)[g]();if(l){l.call(j[0]);}m();});}}};});}));
/*!
 * jQuery Iframe Transport Plugin 1.7
 * https://github.com/blueimp/jQuery-File-Upload
 *
 * Copyright 2011, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */
(function(a){if(typeof define==="function"&&define.amd){define(["jquery"],a);}else{a(window.jQuery);}}(function(b){var a=0;b.ajaxTransport("iframe",function(c){if(c.async){var e,d,f;return{send:function(g,h){e=b('<form style="display:none;"></form>');e.attr("accept-charset",c.formAcceptCharset);f=/\?/.test(c.url)?"&":"?";if(c.type==="DELETE"){c.url=c.url+f+"_method=DELETE";c.type="POST";}else{if(c.type==="PUT"){c.url=c.url+f+"_method=PUT";c.type="POST";}else{if(c.type==="PATCH"){c.url=c.url+f+"_method=PATCH";c.type="POST";}}}a+=1;d=b('<iframe src="javascript:false;" name="iframe-transport-'+a+'"></iframe>').bind("load",function(){var i,j=b.isArray(c.paramName)?c.paramName:[c.paramName];d.unbind("load").bind("load",function(){var k;try{k=d.contents();if(!k.length||!k[0].firstChild){throw new Error();}}catch(l){k=undefined;}h(200,"success",{iframe:k});b('<iframe src="javascript:false;"></iframe>').appendTo(e);window.setTimeout(function(){e.remove();},0);});e.prop("target",d.prop("name")).prop("action",c.url).prop("method",c.type);if(c.formData){b.each(c.formData,function(k,l){b('<input type="hidden"/>').prop("name",l.name).val(l.value).appendTo(e);});}if(c.fileInput&&c.fileInput.length&&c.type==="POST"){i=c.fileInput.clone();c.fileInput.after(function(k){return i[k];});if(c.paramName){c.fileInput.each(function(k){b(this).prop("name",j[k]||c.paramName);});}e.append(c.fileInput).prop("enctype","multipart/form-data").prop("encoding","multipart/form-data");}e.submit();if(i&&i.length){c.fileInput.each(function(l,k){var m=b(i[l]);b(k).prop("name",m.prop("name"));m.replaceWith(k);});}});e.append(d).appendTo(document.body);},abort:function(){if(d){d.unbind("load").prop("src","javascript".concat(":false;"));}if(e){e.remove();}}};}});b.ajaxSetup({converters:{"iframe text":function(c){return c&&b(c[0].body).text();},"iframe json":function(c){return c&&b.parseJSON(b(c[0].body).text());},"iframe html":function(c){return c&&b(c[0].body).html();},"iframe xml":function(c){var d=c&&c[0];return d&&b.isXMLDoc(d)?d:b.parseXML((d.XMLDocument&&d.XMLDocument.xml)||b(d.body).html());},"iframe script":function(c){return c&&b.globalEval(b(c[0].body).text());}}});}));
/*!
 * jQuery File Upload Plugin 5.32.2
 * https://github.com/blueimp/jQuery-File-Upload
 *
 * Copyright 2010, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */
(function(a){if(typeof define==="function"&&define.amd){define(["jquery","jquery.ui.widget"],a);}else{a(window.jQuery);}}(function(a){a.support.fileInput=!(new RegExp("(Android (1\\.[0156]|2\\.[01]))|(Windows Phone (OS 7|8\\.0))|(XBLWP)|(ZuneWP)|(WPDesktop)|(w(eb)?OSBrowser)|(webOS)|(Kindle/(1\\.0|2\\.[05]|3\\.0))").test(window.navigator.userAgent)||a('<input type="file">').prop("disabled"));a.support.xhrFileUpload=!!(window.XMLHttpRequestUpload&&window.FileReader);a.support.xhrFormDataFileUpload=!!window.FormData;a.support.blobSlice=window.Blob&&(Blob.prototype.slice||Blob.prototype.webkitSlice||Blob.prototype.mozSlice);a.widget("blueimp.fileupload",{options:{dropZone:a(document),pasteZone:a(document),fileInput:undefined,replaceFileInput:true,paramName:undefined,singleFileUploads:true,limitMultiFileUploads:undefined,sequentialUploads:false,limitConcurrentUploads:undefined,forceIframeTransport:false,redirect:undefined,redirectParamName:undefined,postMessage:undefined,multipart:true,maxChunkSize:undefined,uploadedBytes:undefined,recalculateProgress:true,progressInterval:100,bitrateInterval:500,autoUpload:true,messages:{uploadedBytes:"Uploaded bytes exceed file size"},i18n:function(c,b){c=this.messages[c]||c.toString();if(b){a.each(b,function(d,e){c=c.replace("{"+d+"}",e);});}return c;},formData:function(b){return b.serializeArray();},add:function(c,b){if(b.autoUpload||(b.autoUpload!==false&&a(this).fileupload("option","autoUpload"))){b.process().done(function(){b.submit();});}},processData:false,contentType:false,cache:false},_specialOptions:["fileInput","dropZone","pasteZone","multipart","forceIframeTransport"],_blobSlice:a.support.blobSlice&&function(){var b=this.slice||this.webkitSlice||this.mozSlice;return b.apply(this,arguments);},_BitrateTimer:function(){this.timestamp=((Date.now)?Date.now():(new Date()).getTime());this.loaded=0;this.bitrate=0;this.getBitrate=function(d,c,b){var e=d-this.timestamp;if(!this.bitrate||!b||e>b){this.bitrate=(c-this.loaded)*(1000/e)*8;this.loaded=c;this.timestamp=d;}return this.bitrate;};},_isXHRUpload:function(b){return !b.forceIframeTransport&&((!b.multipart&&a.support.xhrFileUpload)||a.support.xhrFormDataFileUpload);},_getFormData:function(b){var c;if(typeof b.formData==="function"){return b.formData(b.form);}if(a.isArray(b.formData)){return b.formData;}if(a.type(b.formData)==="object"){c=[];a.each(b.formData,function(d,e){c.push({name:d,value:e});});return c;}return[];},_getTotal:function(c){var b=0;a.each(c,function(d,e){b+=e.size||1;});return b;},_initProgressObject:function(c){var b={loaded:0,total:0,bitrate:0};if(c._progress){a.extend(c._progress,b);}else{c._progress=b;}},_initResponseObject:function(b){var c;if(b._response){for(c in b._response){if(b._response.hasOwnProperty(c)){delete b._response[c];}}}else{b._response={};}},_onProgress:function(f,d){if(f.lengthComputable){var c=((Date.now)?Date.now():(new Date()).getTime()),b;if(d._time&&d.progressInterval&&(c-d._time<d.progressInterval)&&f.loaded!==f.total){return;}d._time=c;b=Math.floor(f.loaded/f.total*(d.chunkSize||d._progress.total))+(d.uploadedBytes||0);this._progress.loaded+=(b-d._progress.loaded);this._progress.bitrate=this._bitrateTimer.getBitrate(c,this._progress.loaded,d.bitrateInterval);d._progress.loaded=d.loaded=b;d._progress.bitrate=d.bitrate=d._bitrateTimer.getBitrate(c,b,d.bitrateInterval);this._trigger("progress",f,d);this._trigger("progressall",f,this._progress);}},_initProgressListener:function(b){var c=this,d=b.xhr?b.xhr():a.ajaxSettings.xhr();if(d.upload){a(d.upload).bind("progress",function(f){var g=f.originalEvent;f.lengthComputable=g.lengthComputable;f.loaded=g.loaded;f.total=g.total;c._onProgress(f,b);});b.xhr=function(){return d;};}},_isInstanceOf:function(b,c){return Object.prototype.toString.call(c)==="[object "+b+"]";},_initXHRData:function(c){var e=this,g,d=c.files[0],b=c.multipart||!a.support.xhrFileUpload,f=c.paramName[0];c.headers=c.headers||{};if(c.contentRange){c.headers["Content-Range"]=c.contentRange;}if(!b||c.blob||!this._isInstanceOf("File",d)){c.headers["Content-Disposition"]='attachment; filename="'+encodeURI(d.name)+'"';}if(!b){c.contentType=d.type;c.data=c.blob||d;}else{if(a.support.xhrFormDataFileUpload){if(c.postMessage){g=this._getFormData(c);if(c.blob){g.push({name:f,value:c.blob});}else{a.each(c.files,function(h,i){g.push({name:c.paramName[h]||f,value:i});});}}else{if(e._isInstanceOf("FormData",c.formData)){g=c.formData;}else{g=new FormData();a.each(this._getFormData(c),function(h,i){g.append(i.name,i.value);});}if(c.blob){g.append(f,c.blob,d.name);}else{a.each(c.files,function(h,i){if(e._isInstanceOf("File",i)||e._isInstanceOf("Blob",i)){g.append(c.paramName[h]||f,i,i.name);}});}}c.data=g;}}c.blob=null;},_initIframeSettings:function(b){var c=a("<a></a>").prop("href",b.url).prop("host");b.dataType="iframe "+(b.dataType||"");b.formData=this._getFormData(b);if(b.redirect&&c&&c!==location.host){b.formData.push({name:b.redirectParamName||"redirect",value:b.redirect});}},_initDataSettings:function(b){if(this._isXHRUpload(b)){if(!this._chunkedUpload(b,true)){if(!b.data){this._initXHRData(b);}this._initProgressListener(b);}if(b.postMessage){b.dataType="postmessage "+(b.dataType||"");}}else{this._initIframeSettings(b);}},_getParamName:function(b){var c=a(b.fileInput),d=b.paramName;if(!d){d=[];c.each(function(){var e=a(this),f=e.prop("name")||"files[]",g=(e.prop("files")||[1]).length;while(g){d.push(f);g-=1;}});if(!d.length){d=[c.prop("name")||"files[]"];}}else{if(!a.isArray(d)){d=[d];}}return d;},_initFormSettings:function(b){if(!b.form||!b.form.length){b.form=a(b.fileInput.prop("form"));if(!b.form.length){b.form=a(this.options.fileInput.prop("form"));}}b.paramName=this._getParamName(b);if(!b.url){b.url=b.form.prop("action")||location.href;}b.type=(b.type||b.form.prop("method")||"").toUpperCase();if(b.type!=="POST"&&b.type!=="PUT"&&b.type!=="PATCH"){b.type="POST";}if(!b.formAcceptCharset){b.formAcceptCharset=b.form.attr("accept-charset");}},_getAJAXSettings:function(c){var b=a.extend({},this.options,c);this._initFormSettings(b);this._initDataSettings(b);return b;},_getDeferredState:function(b){if(b.state){return b.state();}if(b.isResolved()){return"resolved";}if(b.isRejected()){return"rejected";}return"pending";},_enhancePromise:function(b){b.success=b.done;b.error=b.fail;b.complete=b.always;return b;},_getXHRPromise:function(e,d,c){var b=a.Deferred(),f=b.promise();d=d||this.options.context||f;if(e===true){b.resolveWith(d,c);}else{if(e===false){b.rejectWith(d,c);}}f.abort=b.promise;return this._enhancePromise(f);},_addConvenienceMethods:function(f,d){var c=this,b=function(e){return a.Deferred().resolveWith(c,[e]).promise();};d.process=function(g,e){if(g||e){d._processQueue=this._processQueue=(this._processQueue||b(this)).pipe(g,e);}return this._processQueue||b(this);};d.submit=function(){if(this.state()!=="pending"){d.jqXHR=this.jqXHR=(c._trigger("submit",f,this)!==false)&&c._onSend(f,this);}return this.jqXHR||c._getXHRPromise();};d.abort=function(){if(this.jqXHR){return this.jqXHR.abort();}return c._getXHRPromise();};d.state=function(){if(this.jqXHR){return c._getDeferredState(this.jqXHR);}if(this._processQueue){return c._getDeferredState(this._processQueue);}};d.progress=function(){return this._progress;};d.response=function(){return this._response;};},_getUploadedBytes:function(d){var b=d.getResponseHeader("Range"),e=b&&b.split("-"),c=e&&e.length>1&&parseInt(e[1],10);return c&&c+1;},_chunkedUpload:function(m,g){m.uploadedBytes=m.uploadedBytes||0;var f=this,d=m.files[0],e=d.size,b=m.uploadedBytes,c=m.maxChunkSize||e,i=this._blobSlice,j=a.Deferred(),l=j.promise(),h,k;if(!(this._isXHRUpload(m)&&i&&(b||c<e))||m.data){return false;}if(g){return true;}if(b>=e){d.error=m.i18n("uploadedBytes");return this._getXHRPromise(false,m.context,[null,"error",d.error]);}k=function(){var p=a.extend({},m),n=p._progress.loaded;p.blob=i.call(d,b,b+c,d.type);p.chunkSize=p.blob.size;p.contentRange="bytes "+b+"-"+(b+p.chunkSize-1)+"/"+e;f._initXHRData(p);f._initProgressListener(p);h=((f._trigger("chunksend",null,p)!==false&&a.ajax(p))||f._getXHRPromise(false,p.context)).done(function(o,r,q){b=f._getUploadedBytes(q)||(b+p.chunkSize);if(n+p.chunkSize-p._progress.loaded){f._onProgress(a.Event("progress",{lengthComputable:true,loaded:b-p.uploadedBytes,total:b-p.uploadedBytes}),p);}m.uploadedBytes=p.uploadedBytes=b;p.result=o;p.textStatus=r;p.jqXHR=q;f._trigger("chunkdone",null,p);f._trigger("chunkalways",null,p);if(b<e){k();}else{j.resolveWith(p.context,[o,r,q]);}}).fail(function(o,r,q){p.jqXHR=o;p.textStatus=r;p.errorThrown=q;f._trigger("chunkfail",null,p);f._trigger("chunkalways",null,p);j.rejectWith(p.context,[o,r,q]);});};this._enhancePromise(l);l.abort=function(){return h.abort();};k();return l;},_beforeSend:function(c,b){if(this._active===0){this._trigger("start");this._bitrateTimer=new this._BitrateTimer();this._progress.loaded=this._progress.total=0;this._progress.bitrate=0;}this._initResponseObject(b);this._initProgressObject(b);b._progress.loaded=b.loaded=b.uploadedBytes||0;b._progress.total=b.total=this._getTotal(b.files)||1;b._progress.bitrate=b.bitrate=0;this._active+=1;this._progress.loaded+=b.loaded;this._progress.total+=b.total;},_onDone:function(b,g,f,d){var e=d._progress.total,c=d._response;if(d._progress.loaded<e){this._onProgress(a.Event("progress",{lengthComputable:true,loaded:e,total:e}),d);}c.result=d.result=b;c.textStatus=d.textStatus=g;c.jqXHR=d.jqXHR=f;this._trigger("done",null,d);},_onFail:function(d,f,e,c){var b=c._response;if(c.recalculateProgress){this._progress.loaded-=c._progress.loaded;this._progress.total-=c._progress.total;}b.jqXHR=c.jqXHR=d;b.textStatus=c.textStatus=f;b.errorThrown=c.errorThrown=e;this._trigger("fail",null,c);},_onAlways:function(d,e,c,b){this._trigger("always",null,b);},_onSend:function(h,f){if(!f.submit){this._addConvenienceMethods(h,f);}var g=this,j,b,i,c,k=g._getAJAXSettings(f),d=function(){g._sending+=1;k._bitrateTimer=new g._BitrateTimer();j=j||(((b||g._trigger("send",h,k)===false)&&g._getXHRPromise(false,k.context,b))||g._chunkedUpload(k)||a.ajax(k)).done(function(e,m,l){g._onDone(e,m,l,k);}).fail(function(e,m,l){g._onFail(e,m,l,k);}).always(function(m,n,l){g._onAlways(m,n,l,k);g._sending-=1;g._active-=1;if(k.limitConcurrentUploads&&k.limitConcurrentUploads>g._sending){var e=g._slots.shift();while(e){if(g._getDeferredState(e)==="pending"){e.resolve();break;}e=g._slots.shift();}}if(g._active===0){g._trigger("stop");}});return j;};this._beforeSend(h,k);if(this.options.sequentialUploads||(this.options.limitConcurrentUploads&&this.options.limitConcurrentUploads<=this._sending)){if(this.options.limitConcurrentUploads>1){i=a.Deferred();this._slots.push(i);c=i.pipe(d);}else{this._sequence=this._sequence.pipe(d,d);c=this._sequence;}c.abort=function(){b=[undefined,"abort","abort"];if(!j){if(i){i.rejectWith(k.context,b);}return d();}return j.abort();};return this._enhancePromise(c);}return d();},_onAdd:function(k,g){var j=this,n=true,m=a.extend({},this.options,g),d=m.limitMultiFileUploads,h=this._getParamName(m),c,b,l,f;if(!(m.singleFileUploads||d)||!this._isXHRUpload(m)){l=[g.files];c=[h];}else{if(!m.singleFileUploads&&d){l=[];c=[];for(f=0;f<g.files.length;f+=d){l.push(g.files.slice(f,f+d));b=h.slice(f,f+d);if(!b.length){b=h;}c.push(b);}}else{c=h;}}g.originalFiles=g.files;a.each(l||g.files,function(e,i){var o=a.extend({},g);o.files=l?i:[i];o.paramName=c[e];j._initResponseObject(o);j._initProgressObject(o);j._addConvenienceMethods(k,o);n=j._trigger("add",k,o);return n;});return n;},_replaceFileInput:function(b){var c=b.clone(true);a("<form></form>").append(c)[0].reset();b.after(c).detach();a.cleanData(b.unbind("remove"));this.options.fileInput=this.options.fileInput.map(function(d,e){if(e===b[0]){return c[0];}return e;});if(b[0]===this.element[0]){this.element=c;}},_handleFileTreeEntry:function(f,g){var e=this,b=a.Deferred(),c=function(h){if(h&&!h.entry){h.entry=f;}b.resolve([h]);},d;g=g||"";if(f.isFile){if(f._file){f._file.relativePath=g;b.resolve(f._file);}else{f.file(function(h){h.relativePath=g;b.resolve(h);},c);}}else{if(f.isDirectory){d=f.createReader();d.readEntries(function(h){e._handleFileTreeEntries(h,g+f.name+"/").done(function(i){b.resolve(i);}).fail(c);},c);}else{b.resolve([]);}}return b.promise();},_handleFileTreeEntries:function(b,d){var c=this;return a.when.apply(a,a.map(b,function(e){return c._handleFileTreeEntry(e,d);})).pipe(function(){return Array.prototype.concat.apply([],arguments);});},_getDroppedFiles:function(c){c=c||{};var b=c.items;if(b&&b.length&&(b[0].webkitGetAsEntry||b[0].getAsEntry)){return this._handleFileTreeEntries(a.map(b,function(e){var d;if(e.webkitGetAsEntry){d=e.webkitGetAsEntry();if(d){d._file=e.getAsFile();}return d;}return e.getAsEntry();}));}return a.Deferred().resolve(a.makeArray(c.files)).promise();},_getSingleFileInputFiles:function(d){d=a(d);var b=d.prop("webkitEntries")||d.prop("entries"),c,e;if(b&&b.length){return this._handleFileTreeEntries(b);}c=a.makeArray(d.prop("files"));if(!c.length){e=d.prop("value");if(!e){return a.Deferred().resolve([]).promise();}c=[{name:e.replace(/^.*\\/,"")}];}else{if(c[0].name===undefined&&c[0].fileName){a.each(c,function(f,g){g.name=g.fileName;g.size=g.fileSize;});}}return a.Deferred().resolve(c).promise();},_getFileInputFiles:function(b){if(!(b instanceof a)||b.length===1){return this._getSingleFileInputFiles(b);}return a.when.apply(a,a.map(b,this._getSingleFileInputFiles)).pipe(function(){return Array.prototype.concat.apply([],arguments);});},_onChange:function(d){var b=this,c={fileInput:a(d.target),form:a(d.target.form)};this._getFileInputFiles(c.fileInput).always(function(e){c.files=e;if(b.options.replaceFileInput){b._replaceFileInput(c.fileInput);}if(b._trigger("change",d,c)!==false){b._onAdd(d,c);}});},_onPaste:function(d){var b=d.originalEvent&&d.originalEvent.clipboardData&&d.originalEvent.clipboardData.items,c={files:[]};if(b&&b.length){a.each(b,function(e,g){var f=g.getAsFile&&g.getAsFile();if(f){c.files.push(f);}});if(this._trigger("paste",d,c)===false||this._onAdd(d,c)===false){return false;}}},_onDrop:function(f){f.dataTransfer=f.originalEvent&&f.originalEvent.dataTransfer;var b=this,d=f.dataTransfer,c={};if(d&&d.files&&d.files.length){f.preventDefault();this._getDroppedFiles(d).always(function(e){c.files=e;if(b._trigger("drop",f,c)!==false){b._onAdd(f,c);}});}},_onDragOver:function(c){c.dataTransfer=c.originalEvent&&c.originalEvent.dataTransfer;var b=c.dataTransfer;if(b){if(this._trigger("dragover",c)===false){return false;}if(a.inArray("Files",b.types)!==-1){b.dropEffect="copy";c.preventDefault();}}},_initEventHandlers:function(){if(this._isXHRUpload(this.options)){this._on(this.options.dropZone,{dragover:this._onDragOver,drop:this._onDrop});this._on(this.options.pasteZone,{paste:this._onPaste});}if(a.support.fileInput){this._on(this.options.fileInput,{change:this._onChange});}},_destroyEventHandlers:function(){this._off(this.options.dropZone,"dragover drop");this._off(this.options.pasteZone,"paste");this._off(this.options.fileInput,"change");},_setOption:function(b,c){var d=a.inArray(b,this._specialOptions)!==-1;if(d){this._destroyEventHandlers();}this._super(b,c);if(d){this._initSpecialOptions();this._initEventHandlers();}},_initSpecialOptions:function(){var b=this.options;if(b.fileInput===undefined){b.fileInput=this.element.is('input[type="file"]')?this.element:this.element.find('input[type="file"]');}else{if(!(b.fileInput instanceof a)){b.fileInput=a(b.fileInput);}}if(!(b.dropZone instanceof a)){b.dropZone=a(b.dropZone);}if(!(b.pasteZone instanceof a)){b.pasteZone=a(b.pasteZone);}},_getRegExp:function(d){var c=d.split("/"),b=c.pop();c.shift();return new RegExp(c.join("/"),b);},_isRegExpOption:function(b,c){return b!=="url"&&a.type(c)==="string"&&/^\/.*\/[igm]{0,3}$/.test(c);},_initDataAttributes:function(){var c=this,b=this.options;a.each(a(this.element[0].cloneNode(false)).data(),function(d,e){if(c._isRegExpOption(d,e)){e=c._getRegExp(e);}b[d]=e;});},_create:function(){this._initDataAttributes();this._initSpecialOptions();this._slots=[];this._sequence=this._getXHRPromise(true);this._sending=this._active=0;this._initProgressObject(this);this._initEventHandlers();},active:function(){return this._active;},progress:function(){return this._progress;},add:function(c){var b=this;if(!c||this.options.disabled){return;}if(c.fileInput&&!c.files){this._getFileInputFiles(c.fileInput).always(function(d){c.files=d;b._onAdd(null,c);});}else{c.files=a.makeArray(c.files);this._onAdd(null,c);}},send:function(f){if(f&&!this.options.disabled){if(f.fileInput&&!f.files){var d=this,b=a.Deferred(),g=b.promise(),c,e;g.abort=function(){e=true;if(c){return c.abort();}b.reject(null,"abort","abort");return g;};this._getFileInputFiles(f.fileInput).always(function(h){if(e){return;}if(!h.length){b.reject();return;}f.files=h;c=d._onSend(null,f).then(function(i,k,j){b.resolve(i,k,j);},function(i,k,j){b.reject(i,k,j);});});return this._enhancePromise(g);}f.files=a.makeArray(f.files);if(f.files.length){return this._onSend(null,f);}}return this._getXHRPromise(false,f&&f.context);}});}));