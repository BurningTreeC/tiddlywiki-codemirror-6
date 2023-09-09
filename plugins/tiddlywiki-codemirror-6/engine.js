/*\
title: $:/plugins/tiddlywiki/codemirror/engine.js
type: application/javascript
module-type: library

Text editor engine based on a CodeMirror instance

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var CODEMIRROR_OPTIONS = "$:/config/CodeMirror",
HEIGHT_VALUE_TITLE = "$:/config/TextEditor/EditorHeight/Height",
CONFIG_FILTER = "[all[shadows+tiddlers]prefix[$:/config/codemirror/]]"
	
// Install CodeMirror
if($tw.browser && !window.CM) {

	window.CM = require("$:/plugins/BTC/tiddlywiki-codemirror-6/lib/codemirror.js");
}

function CodeMirrorEngine(options) {

	// Save our options
	var self = this;
	options = options || {};
	this.widget = options.widget;
	this.value = options.value;
	this.parentNode = options.parentNode;
	this.nextSibling = options.nextSibling;
	// Create the wrapper DIV
	this.domNode = this.widget.document.createElement("div");
	if(this.widget.editClass) {
		this.domNode.className = this.widget.editClass;
	}
	this.domNode.style.display = "inline-block";
	this.parentNode.insertBefore(this.domNode,this.nextSibling);
	this.widget.domNodes.push(this.domNode);

	var {basicSetup,EditorView} = CM["codemirror"];
	var {javascript,javascriptLanguage,scopeCompletionSource} = CM["@codemirror/lang-javascript"];

	this.cm = new EditorView({doc: options.value,extensions:[basicSetup,javascript(),javascriptLanguage.data.of({autocomplete:scopeCompletionSource(globalThis)})],parent:this.domNode});
}

/*
Set the text of the engine if it doesn't currently have focus
*/
CodeMirrorEngine.prototype.setText = function(text,type) {
	var self = this;
	self.cm.setOption("mode",type);
	if(!this.cm.hasFocus()) {
		this.updateDomNodeText(text);
	}
};

/*
Update the DomNode with the new text
*/
CodeMirrorEngine.prototype.updateDomNodeText = function(text) {
	this.cm.setValue(text);
};

/*
Get the text of the engine
*/
CodeMirrorEngine.prototype.getText = function() {
	return this.cm.getValue();
};

/*
Fix the height of textarea to fit content
*/
CodeMirrorEngine.prototype.fixHeight = function() {
	if(this.widget.editAutoHeight) {
		// Resize to fit
		this.cm.setSize(null,null);
	} else {
		var fixedHeight = parseInt(this.widget.wiki.getTiddlerText(HEIGHT_VALUE_TITLE,"400px"),10);
		fixedHeight = Math.max(fixedHeight,20);
		this.cm.setSize(null,fixedHeight);
	}
};

/*
Focus the engine node
*/
CodeMirrorEngine.prototype.focus  = function() {
	this.cm.focus();
}

/*
Create a blank structure representing a text operation
*/
CodeMirrorEngine.prototype.createTextOperation = function() {
	var selections = this.cm.listSelections();
	if(selections.length > 0) {
		var anchorPos = this.cm.indexFromPos(selections[0].anchor),
		headPos = this.cm.indexFromPos(selections[0].head);
	}
	var operation = {
		text: this.cm.getValue(),
		selStart: Math.min(anchorPos,headPos),
		selEnd: Math.max(anchorPos,headPos),
		cutStart: null,
		cutEnd: null,
		replacement: null,
		newSelStart: null,
		newSelEnd: null
	};
	operation.selection = operation.text.substring(operation.selStart,operation.selEnd);
	return operation;
};

/*
Execute a text operation
*/
CodeMirrorEngine.prototype.executeTextOperation = function(operation) {
	// Perform the required changes to the text area and the underlying tiddler
	var newText = operation.text;
	if(operation.replacement !== null) {
		this.cm.replaceRange(operation.replacement,this.cm.posFromIndex(operation.cutStart),this.cm.posFromIndex(operation.cutEnd));
		this.cm.setSelection(this.cm.posFromIndex(operation.newSelStart),this.cm.posFromIndex(operation.newSelEnd));
		newText = operation.text.substring(0,operation.cutStart) + operation.replacement + operation.text.substring(operation.cutEnd);
	}
	this.cm.focus();
	return newText;
};

exports.CodeMirrorEngine = $tw.browser ? CodeMirrorEngine : require("$:/core/modules/editor/engines/simple.js").SimpleEngine;

})();
