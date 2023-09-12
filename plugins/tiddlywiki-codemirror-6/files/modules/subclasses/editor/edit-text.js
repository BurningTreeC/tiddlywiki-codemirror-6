/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/subclasses/editor/edit-text.js
type: application/javascript
module-type: widget-subclass

Widget base class

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.baseClass = "edit-codemirror-6";

exports.constructor = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};

exports.prototype = {};

exports.prototype.execute = function() {
	this.editType = this.getAttribute("type");
	Object.getPrototypeOf(Object.getPrototypeOf(this)).execute.call(this);
};

exports.prototype.handlePasteEvent = function(event) {
	if(event.clipboardData && event.clipboardData.files && event.clipboardData.files.length) {
		event.preventDefault();
		event.stopPropagation();
		this.dispatchDOMEvent(this.cloneEvent(event,["clipboardData"]));
		return true;
	}
	return false;
};

exports.prototype.refresh = function(changedTiddlers) {
	var changedAttributes = this.computeAttributes();
	if(changedAttributes.type || changedTiddlers["$:/config/codemirror-6/indentWithTab"] || changedTiddlers["$:/config/codemirror-6/lineNumbers"]) {
		this.refreshSelf();
		return true;
	}
	// Call the base class handleChangeEvent function
	Object.getPrototypeOf(Object.getPrototypeOf(this)).refresh.call(this,changedTiddlers);
};

})();