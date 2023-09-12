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
	var {EditorView,dropCursor,keymap,highlightSpecialChars,drawSelection,highlightActiveLine,rectangularSelection,crosshairCursor,lineNumbers,highlightActiveLineGutter} = CM["@codemirror/view"];
	var {defaultKeymap,standardKeymap,indentWithTab,history,historyKeymap} = CM["@codemirror/commands"];
	var {language,indentUnit,defaultHighlightStyle,syntaxHighlighting,indentOnInput,bracketMatching,foldGutter,foldKeymap} = CM["@codemirror/language"];
	var {Extension,EditorState,EditorSelection,Prec} = CM["@codemirror/state"];
	var {searchKeymap,highlightSelectionMatches} = CM["@codemirror/search"];
	var {autocompletion,completionKeymap,closeBrackets,closeBracketsKeymap} = CM["@codemirror/autocomplete"];
	var {lintKeymap} = CM["@codemirror/lint"];
	var {oneDark} = CM["@codemirror/theme-one-dark"];

	this.editorSelection = EditorSelection;
	this.dropCursor = dropCursor;

	var themeSettings = {
		background: '#fef7e5',
		foreground: '#586E75',
		caret: '#000000',
		selection: '#073642',
		gutterBackground: '#fef7e5',
		gutterForeground: '#586E7580',
		lineHighlight: '#EEE8D5',
	};

	var solarizedLightTheme = EditorView.theme({
		"&": {
				backgroundColor: themeSettings.background,
				color: themeSettings.foreground
		},
		'.cm-content': {
				caretColor: themeSettings.caret,
		},
		'.cm-cursor, .cm-dropCursor': {
				borderLeftColor: themeSettings.caret,
		},
		'&.cm-focused .cm-selectionBackgroundm .cm-selectionBackground, .cm-content ::selection':
				{
				backgroundColor: themeSettings.selection,
		},
		'.cm-activeLine': {
				backgroundColor: themeSettings.lineHighlight,
		},
		'.cm-gutters': {
				backgroundColor: themeSettings.gutterBackground,
				color: themeSettings.gutterForeground,
		},
		'.cm-activeLineGutter': {
				backgroundColor: themeSettings.lineHighlight,
		}
	},
	{
		dark: false
	});

	var {tags} = CM["@lezer/highlight"];

	var solarizedLightStyles = [
		{
			tag: tags.comment,
			color: '#93A1A1',
		},
		{
			tag: tags.string,
			color: '#2AA198',
		},
		{
			tag: tags.regexp,
			color: '#D30102',
		},
		{
			tag: tags.number,
			color: '#D33682',
		},
		{
			tag: tags.variableName,
			color: '#268BD2',
		},
		{
			tag: [tags.keyword, tags.operator, tags.punctuation],
			color: '#859900',
		},
		{
			tag: [tags.definitionKeyword, tags.modifier],
			color: '#073642',
			fontWeight: 'bold',
		},
		{
			tag: [tags.className, tags.self, tags.definition(tags.propertyName)],
			color: '#268BD2',
		},
		{
			tag: tags.function(tags.variableName),
			color: '#268BD2',
		},
		{
			tag: [tags.bool, tags.null],
			color: '#B58900',
		},
		{
			tag: tags.tagName,
			color: '#268BD2',
			fontWeight: 'bold',
		},
		{
			tag: tags.angleBracket,
			color: '#93A1A1',
		},
		{
			tag: tags.attributeName,
			color: '#93A1A1',
		},
		{
			tag: tags.typeName,
			color: '#859900',
		}
	];

	var {HighlightStyle,TagStyle,syntaxHighlighting} = CM["@codemirror/language"];

	var highlightStyle = HighlightStyle.define(solarizedLightStyles);

	var editorOptions = {
		doc: options.value,
		parent: this.domNode,
		extensions: [
			dropCursor(),
			//Prec.high(oneDark),
			//Prec.high(syntaxHighlighting(highlightStyle)),
			Prec.high(EditorView.domEventHandlers({
				drop(event,view) {
					self.dragCancel = false;
					return self.handleDropEvent(event,view);
				},
				dragstart(event,view) {
					self.dragCancel = true;
					return false;
				},
				dragenter(event,view) {
					self.dragCancel = true;
					console.log("dragenter");
					if(self.widget.isFileDropEnabled && ($tw.utils.dragEventContainsFiles(event) || event.dataTransfer.files.length)) {
						console.log("preventing default dragenter");
						event.preventDefault();
						return true;
					}
					return false;
				},
				dragover(event,view) {
					self.dragCancel = true;
					console.log("dragover");
					if(self.widget.isFileDropEnabled && ($tw.utils.dragEventContainsFiles(event) || event.dataTransfer.files.length)) {
						console.log("preventing default dragover");
						event.preventDefault();
						return true;
					}
					return false;
				},
				dragleave(event,view) {
					self.dragCancel = false;
					console.log("dragleave");
					if(self.widget.isFileDropEnabled) {
						console.log("preventing default dragleave");
						event.preventDefault();
						return true;
					}
					return false;
				},
				dragend(event,view) {
					console.log("DRAGEND");
					self.dragCancel = true;
					if(self.widget.isFileDropEnabled) {
						//event.preventDefault();
						//return true;
					}
					return false;
				},
				paste(event,view) {
					console.log("PASTE");
					if(self.widget.isFileDropEnabled) {
						event["twEditor"] = true;
						return self.widget.handlePasteEvent.call(self.widget,event);
					} else {
						event["twEditor"] = true;
					}
					return false;
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
					return false;
				}
			})),
			//basicSetup,
			lineNumbers(),
			highlightActiveLineGutter(),
			highlightSpecialChars(),
			history(),
			foldGutter(),
			drawSelection(),
			EditorState.allowMultipleSelections.of(true),
			indentOnInput(),
			syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
			bracketMatching(),
			closeBrackets(),
			autocompletion(),
			rectangularSelection(),
			crosshairCursor(),
			highlightActiveLine(),
			highlightSelectionMatches(),
			keymap.of([
				...closeBracketsKeymap,
				...defaultKeymap,
				...searchKeymap,
				...historyKeymap,
				...foldKeymap,
				...completionKeymap,
				...lintKeymap
			]),
			EditorView.lineWrapping,
			EditorView.contentAttributes.of({tabindex: self.widget.editTabIndex ? self.widget.editTabIndex : ""}),
			EditorView.perLineTextDirection.of(true),
			EditorView.updateListener.of(function(v) {
				if(v.docChanged) {
					self.widget.saveChanges(self.cm.state.doc.toString());
				}
			}),
		]
	};

	if(this.widget.wiki.getTiddlerText("$:/config/codemirror-6/indentWithTab") === "yes") {
		editorOptions.extensions.push(
			keymap.of([
				indentWithTab
			])
		);
	};

	var mode = this.widget.editType;
	switch (mode) {
		case ("text/vnd.tiddlywiki" || "text/html"):
			var {html,htmlLanguage} = CM["@codemirror/lang-html"];
			editorOptions.extensions.push(html({selfClosingTags: true}));
			break;
		case "application/javascript":
			var {javascript,javascriptLanguage,scopeCompletionSource} = CM["@codemirror/lang-javascript"];
			editorOptions.extensions.push(javascript());
			/*editorOptions.extensions.push(
				javascriptLanguage.data.of({
					autocomplete: scopeCompletionSource(globalThis)//self.domNode.ownerDocument.defaultView)
				})
			);*/
			break;
		case "application/json":
			var {json,jsonLanguage} = CM["@codemirror/lang-json"];
			editorOptions.extensions.push(json());
			break;
		case "text/css":
			var {css,cssLanguage} = CM["@codemirror/lang-css"];
			editorOptions.extensions.push(css());
			break;
		case ("text/markdown" || "text/x-markdown"):
			var {markdown,markdownLanguage} = CM["@codemirror/lang-markdown"];
			editorOptions.extensions.push(markdown());
			break;
		default:
			break;
	};
	this.cm = new EditorView(editorOptions);
};

CodeMirrorEngine.prototype.handleDropEvent = function(event,view) {
	console.log("DROP");
	if(!this.widget.isFileDropEnabled) {
		event.stopPropagation();
		return false;
	}
	if($tw.utils.dragEventContainsFiles(event) || event.dataTransfer.files.length) {
		var dropCursorPos = view.posAtCoords({x: event.clientX, y: event.clientY},true);
		view.dispatch({selection: {anchor: dropCursorPos, head: dropCursorPos}});
		event.preventDefault();
		return true;
	}
	return false;
};

CodeMirrorEngine.prototype.handleDragEnterEvent = function(event) {
	return false;
};

CodeMirrorEngine.prototype.handleKeydownEvent = function(event,view) {
	if($tw.keyboardManager.handleKeydownEvent(event,{onlyPriority: true})) {
		this.dragCancel = false;
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
		var handled = undefined;
		for(var i=0; i<keyboardWidgets.length; i++) {
			var keyboardWidget = keyboardWidgets[i];
			var keyInfoArray = keyboardWidget.keyInfoArray;
			if($tw.keyboardManager.checkKeyDescriptors(event,keyInfoArray)) {
				if(this.dragCancel && ($tw.keyboardManager.getPrintableShortcuts(keyInfoArray).indexOf("Escape") !== -1)) {
					handled = false;
				} else {
					handled = true;
				}
			}
		}
		if(handled) {
			console.log("HANDLED");
			this.dragCancel = false;
			return true;
		} else if(handled === false) {
			event.stopPropagation();
			this.dragCancel = false;
			return true;
		}
	}
	this.dragCancel = false;
	return this.widget.handleKeydownEvent.call(this.widget,event);
};

/*
Set the text of the engine if it doesn't currently have focus
*/
CodeMirrorEngine.prototype.setText = function(text,type) {
	//var {Compartment} = CM["@codemirror/state"];
	//var languageCompartment = new Compartment();
	if(!this.cm.hasFocus) {
		this.updateDomNodeText(text);
	}
/*	switch (type) {
		case ("text/vnd.tiddlywiki" || "text/html"):
			var {html,htmlLanguage} = CM["@codemirror/lang-html"];
			this.cm.dispatch({
				effects: languageCompartment.reconfigure(html({selfClosingTags: true}))
			});
			break;
		case "application/javascript":
			var {javascript,javascriptLanguage,scopeCompletionSource} = CM["@codemirror/lang-javascript"];
			this.cm.dispatch({
				effects: languageCompartment.reconfigure(javascript())
			});
			break;
		case "text/css":
			var {css,cssLanguage} = CM["@codemirror/lang-css"];
			this.cm.dispatch({
				effects: languageCompartment.reconfigure(css())
			});
			break;
		default:
			break;
	};*/
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
		var ranges = this.cm.state.selection.ranges;
		this.cm.dispatch(this.cm.state.changeByRange(function(range) {
			var index;
			for(var i=0; i<ranges.length; i++) {
				if(ranges[i] === range) {
					index = i;
				}
			}
			var editorChanges = [{from: operations[index].cutStart, to: operations[index].cutEnd, insert: operations[index].replacement}];
			var selectionRange = self.editorSelection.range(operations[index].newSelStart,operations[index].newSelEnd);
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
