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

exports.baseClass = "edit-text";

exports.constructor = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};

exports.prototype = {};

exports.prototype.execute = function() {
	this.editType = this.getAttribute("type");
	Object.getPrototypeOf(Object.getPrototypeOf(this)).execute.call(this);
};

exports.prototype.refresh = function(changedTiddlers) {
	// Call the base class handleChangeEvent function
	Object.getPrototypeOf(Object.getPrototypeOf(this)).refresh.call(this,changedTiddlers);
};

})();