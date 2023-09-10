/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/engine.js
type: application/javascript
module-type: library

Text editor engine based on a CodeMirror instance

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";
	
// Install CodeMirror
if($tw.browser && !window.CM) {
	require("$:/plugins/BTC/tiddlywiki-codemirror-6/lib/codemirror.js");
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

	var {minimalSetup,basicSetup} = CM["codemirror"];
	var {EditorView, keymap} = CM["@codemirror/view"];
	
	var {defaultKeymap,standardKeymap,indentWithTab} = CM["@codemirror/commands"];
	var {language} = CM["@codemirror/language"];

	var editorOptions = {
		doc: options.value,
		parent: this.domNode,
		extensions: [
			basicSetup,
			keymap.of([
				indentWithTab
			]),
			EditorView.lineWrapping,
			EditorView.contentAttributes.of({tabindex: self.widget.editTabIndex ? self.widget.editTabIndex : ""}),
			EditorView.perLineTextDirection.of(true),
			EditorView.updateListener.of(function(v) {
				if(v.docChanged) {
					self.widget.saveChanges(self.cm.state.doc.toString());
				}
			}),
			EditorView.domEventHandlers({
				drop(event,view) {
					return self.handleDropEvent(event,view);
				},
				paste(event,view) {
					console.log("PASTE");
				},
				keydown(event,view) {
					return self.handleKeydownEvent(event,view);
				},
				focus(event,view) {
					console.log("FOCUS");
					if(self.widget.editCancelPopups) {
						$tw.popup.cancel(0);
					}
					return false;
				},
				blur(event,view) {
					console.log("BLUR");

				}
			})			
		]
	};

	var mode = this.widget.getEditInfo().type;
	switch (mode) {
		case ("text/vnd.tiddlywiki" || "text/html"):
			var {html,htmlLanguage} = CM["@codemirror/lang-html"];
			editorOptions.extensions.push(html({selfClosingTags: true}));
			break;
		case "application/javascript":
			var {javascript,javascriptLanguage,scopeCompletionSource} = CM["@codemirror/lang-javascript"];
			editorOptions.extensions.push(javascript());
			editorOptions.extensions.push(
				javascriptLanguage.data.of({
					autocomplete: scopeCompletionSource(globalThis)//self.domNode.ownerDocument.defaultView)
				})
			);
			break;
		case "text/css":
			var {css,cssLanguage} = CM["@codemirror/lang-css"];
			console.log(css);
			editorOptions.extensions.push(css());
			break;
		default:
			break;
	}

	this.cm = new EditorView(editorOptions);

/*	this.cm = new EditorView({
		doc: options.value,
		extensions: [
			basicSetup,
			html({selfClosingTags: true}),
			javascript(),
			javascriptLanguage.data.of({
				autocomplete: scopeCompletionSource(globalThis)//self.domNode.ownerDocument.defaultView)
			}),
			keymap.of([
				indentWithTab
			]), // ,defaultKeymap
			EditorView.lineWrapping,
			EditorView.contentAttributes.of({tabindex: self.widget.editTabIndex ? self.widget.editTabIndex : ""}),
			EditorView.perLineTextDirection.of(true),
			EditorView.updateListener.of(function(v) {
				if(v.docChanged) {
					self.widget.saveChanges(self.cm.state.doc.toString());
				}
			}),
			EditorView.domEventHandlers({
				drop(event,view) {
					return self.handleDropEvent(event,view);
				},
				paste(event,view) {
					console.log("PASTE");
				},
				keydown(event,view) {
					return self.handleKeydownEvent(event,view);
				},
				focus(event,view) {
					console.log("FOCUS");
					if(self.widget.editCancelPopups) {
						$tw.popup.cancel(0);
					}
					return false;
				},
				blur(event,view) {
					console.log("BLUR");

				}
			})
		],
		parent:this.domNode
	});*/
};

CodeMirrorEngine.prototype.handleDropEvent = function(event,view) {
	console.log("DROP");
	return false;
};

CodeMirrorEngine.prototype.handleKeydownEvent = function(event,view) {
	console.log("KEYDOWN");
	if($tw.keyboardManager.handleKeydownEvent(event,{onlyPriority: true})) {
		return true;
	}
	var widget = this.widget;
	var keyboardWidgets = [];
	while(widget) {
		if(widget.parseTreeNode.type === "keyboard") {
			keyboardWidgets.push(widget);
		}
		widget = widget.parentWidget;
	}
	if(keyboardWidgets.length > 0) {
		var handled;
		for(var i=0; i<keyboardWidgets.length; i++) {
			var keyboardWidget = keyboardWidgets[i];
			var keyInfoArray = keyboardWidget.keyInfoArray;
			if($tw.keyboardManager.checkKeyDescriptors(event,keyInfoArray)) {
				handled = true;
			}
		}
		if(handled) {
			console.log("HANDLED");
			return true;
		}
	}
	return this.widget.handleKeydownEvent.call(this.widget,event);
};

/*
Set the text of the engine if it doesn't currently have focus
*/
CodeMirrorEngine.prototype.setText = function(text,type) {
	var self = this;
	//self.cm.setOption("mode",type);
	if(!this.cm.hasFocus) {
		this.updateDomNodeText(text);
	}
};

/*
Update the DomNode with the new text
*/
CodeMirrorEngine.prototype.updateDomNodeText = function(text) {
	var self = this;
	var selections = this.cm.state.selection;
	this.cm.dispatch(this.cm.state.update({
		changes: {
			from: 0,
			to: self.cm.state.doc.length,
			insert: text
		},
		selection: selections,
		docChanged: true
	}));
};

/*
Get the text of the engine
*/
CodeMirrorEngine.prototype.getText = function() {
	return this.cm.state.doc.toString();
};

/*
Fix the height of textarea to fit content
*/
CodeMirrorEngine.prototype.fixHeight = function() {
	if(this.widget.editAutoHeight) {
		// Resize to fit
		//this.cm.setSize(null,null);
	} else {
		//var fixedHeight = parseInt(this.widget.wiki.getTiddlerText(HEIGHT_VALUE_TITLE,"400px"),10);
		//fixedHeight = Math.max(fixedHeight,20);
		//this.cm.setSize(null,fixedHeight);
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
	this.isOngoingTextOperation = true;
	var selections = this.cm.state.selection.ranges;
	var operations = [];
	for(var i=0; i<selections.length; i++) {
		var anchorPos = selections[i].from,
			headPos = selections[i].to;
		var operation = {
			text: this.cm.state.doc.toString(),
			selStart: anchorPos,
			selEnd: headPos,
			cutStart: null,
			cutEnd: null,
			replacement: null,
			newSelStart: null,
			newSelEnd: null
		}
		operation.selection = this.cm.state.sliceDoc(anchorPos,headPos);
		operations.push(operation);
	}
	return operations;
};

/*
Execute a text operation
*/
CodeMirrorEngine.prototype.executeTextOperation = function(operations) {
	var self = this;
	if(operations.length) {
		var {EditorSelection} = CM["@codemirror/state"];
		var ranges = this.cm.state.selection.ranges;
		this.cm.dispatch(this.cm.state.changeByRange(function(range) {
			var index;
			for(var i=0; i<ranges.length; i++) {
				if(ranges[i] === range) {
					index = i;
				}
			}
			var editorChanges = [{from: operations[index].cutStart, to: operations[index].cutEnd, insert: operations[index].replacement}];
			var selectionRange = EditorSelection.range(operations[index].newSelStart,operations[index].newSelEnd);
			return {
				changes: editorChanges,
				range: selectionRange
			}
		}));
	}
	this.cm.focus();
	return this.cm.state.doc.toString();
};

exports.CodeMirrorEngine = $tw.browser ? CodeMirrorEngine : require("$:/core/modules/editor/engines/simple.js").SimpleEngine;

})();
