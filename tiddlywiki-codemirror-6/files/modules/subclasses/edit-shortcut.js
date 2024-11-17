/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/subclasses/edit-shortcut.js
type: application/javascript
module-type: widget-subclass

Widget base class

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.baseClass = "edit-shortcut";

exports.constructor = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};

exports.prototype = {};

/*
Handle a dom "keydown" event
*/
exports.prototype.handleKeydownEvent = function(event) {
	// Ignore shift, ctrl, meta, alt
	if(event.key && $tw.keyboardManager.getModifierKeys().indexOf(event.key) === -1) {
		// Get the shortcut text representation
		var value = $tw.keyboardManager.getPrintableShortcuts([{
			ctrlKey: event.ctrlKey,
			shiftKey: event.shiftKey,
			altKey: event.altKey,
			metaKey: event.metaKey,
			key: event.key
		}]);
		if(value.length > 0) {
			this.wiki.setText(this.shortcutTiddler,this.shortcutField,this.shortcutIndex,value[0]);
		}
		// Ignore the keydown if it was already handled
		event.preventDefault();
		event.stopPropagation();
		return true;
	} else {
		return false;
	}
};

})();
