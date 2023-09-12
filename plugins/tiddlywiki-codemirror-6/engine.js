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
	var {defaultKeymap,standardKeymap,indentWithTab,history,historyKeymap,undo,redo} = CM["@codemirror/commands"];
	var {language,indentUnit,defaultHighlightStyle,syntaxHighlighting,indentOnInput,bracketMatching,foldGutter,foldKeymap} = CM["@codemirror/language"];
	var {Extension,EditorState,EditorSelection,Prec} = CM["@codemirror/state"];
	var {searchKeymap,highlightSelectionMatches} = CM["@codemirror/search"];
	var {autocompletion,completionKeymap,closeBrackets,closeBracketsKeymap} = CM["@codemirror/autocomplete"];
	var {lintKeymap} = CM["@codemirror/lint"];
	var {oneDark} = CM["@codemirror/theme-one-dark"];

	this.editorSelection = EditorSelection;
	this.dropCursor = dropCursor;
	this.undo = undo;
	this.redo = redo;

	// Solarized light theme adapted from: https://github.com/craftzdog/cm6-themes/blob/main/packages/solarized-light/src/index.ts

	var base00 = "#657b83",
		base01 = "#586e75",
		base02 = "#073642",
		base03 = "#002b36",
		base0 = "#839496",
		base1 = "#93a1a1",
		base2 = "#eee8d5",
		base3 = "#fdf6e3",
		base_red = "#dc322f",
		base_orange = "#cb4b16",
		base_yellow = "#b58900",
		base_green = "#859900",
		base_cyan = "#2aa198",
		base_blue = "#268bd2",
		base_violet = "#6c71c4",
		base_magenta = "#d33682";

	var invalid = "#d30102";
	var darkBackground = "#dfd9c8";
	var highlightBackground = darkBackground;
	var background = base3;
	var tooltipBackground = base01;
	var selection = darkBackground;
	var cursor = base01;

	var solarizedLightTheme = EditorView.theme(
	{
		"&": {
			color: base00,
			backgroundColor: background
		},

		".cm-content": {
			caretColor: cursor
		},

		".cm-cursor, .cm-dropCursor": { borderLeftColor: cursor },
		"&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: selection },
		".cm-panels": { backgroundColor: darkBackground, color: base03 },
		".cm-panels.cm-panels-top": { borderBottom: "2px solid black" },
		".cm-panels.cm-panels-bottom": { borderTop: "2px solid black" },

		".cm-searchMatch": {
			backgroundColor: "#72a1ff59",
			outline: "1px solid #457dff"
		},
		".cm-searchMatch.cm-searchMatch-selected": {
			backgroundColor: "#6199ff2f"
		},

		".cm-activeLine": { backgroundColor: highlightBackground },
		".cm-selectionMatch": { backgroundColor: "#aafe661a" },

		"&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
			outline: `1px solid ${base1}`
		},

		".cm-gutters": {
			backgroundColor: "#00000010",
			color: base00,
			border: "none"
		},

		".cm-activeLineGutter": {
			backgroundColor: highlightBackground
		},

		".cm-foldPlaceholder": {
			backgroundColor: "transparent",
			border: "none",
			color: "#ddd"
		},

		".cm-tooltip": {
			border: "none",
			backgroundColor: tooltipBackground
		},
		".cm-tooltip .cm-tooltip-arrow:before": {
			borderTopColor: "transparent",
			borderBottomColor: "transparent"
		},
		".cm-tooltip .cm-tooltip-arrow:after": {
			borderTopColor: tooltipBackground,
			borderBottomColor: tooltipBackground
		},
		".cm-tooltip-autocomplete": {
			"& > ul > li[aria-selected]": {
				backgroundColor: highlightBackground,
				color: base03
			}
		}
	},
	{ dark: false });

	var {tags} = CM["@lezer/highlight"];
	var {HighlightStyle,TagStyle,syntaxHighlighting} = CM["@codemirror/language"];

	var solarizedLightHighlightStyle = HighlightStyle.define([
		{ tag: tags.keyword, color: base_green },
		{
			tag: [tags.name, tags.deleted, tags.character, tags.propertyName, tags.macroName],
			color: base_cyan
		},
		{ tag: [tags.variableName], color: base_blue },
		{ tag: [tags.function(tags.variableName)], color: base_blue },
		{ tag: [tags.labelName], color: base_magenta },
		{
			tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)],
			color: base_yellow
		},
		{ tag: [tags.definition(tags.name), tags.separator], color: base_cyan },
		{ tag: [tags.brace], color: base_magenta },
		{
			tag: [tags.annotation],
			color: invalid
		},
		{
			tag: [tags.number, tags.changed, tags.annotation, tags.modifier, tags.self, tags.namespace],
			color: base_magenta
		},
		{
			tag: [tags.typeName, tags.className],
			color: base_orange
		},
		{
			tag: [tags.operator, tags.operatorKeyword],
			color: base_violet
		},
		{
			tag: [tags.tagName],
			color: base_blue
		},
		{
			tag: [tags.squareBracket],
			color: base_red
		},
		{
			tag: [tags.angleBracket],
			color: base02
		},
		{
			tag: [tags.attributeName],
			color: base1
		},
		{
			tag: [tags.regexp],
			color: invalid
		},
		{
			tag: [tags.quote],
			color: base_green
		},
		{ tag: [tags.string], color: base_yellow },
		{
			tag: tags.link,
			color: base_cyan,
			textDecoration: 'underline',
			textUnderlinePosition: 'under'
		},
		{
			tag: [tags.url, tags.escape, tags.special(tags.string)],
			color: base_yellow
		},
		{ tag: [tags.meta], color: base_red },
		{ tag: [tags.comment], color: base02, fontStyle: 'italic' },
		{ tag: tags.strong, fontWeight: 'bold', color: base01 },
		{ tag: tags.emphasis, fontStyle: 'italic', color: base_green },
		{ tag: tags.strikethrough, textDecoration: 'line-through' },
		{ tag: tags.heading, fontWeight: 'bold', color: base_yellow },
		{ tag: tags.heading1, fontWeight: 'bold', color: base03 },
		{
			tag: [tags.heading2, tags.heading3, tags.heading4],
			fontWeight: 'bold',
			color: base03
		},
		{
			tag: [tags.heading5, tags.heading6],
			color: base03
		},
		{ tag: [tags.atom, tags.bool, tags.special(tags.variableName)], color: base_magenta },
		{
			tag: [tags.processingInstruction, tags.inserted, tags.contentSeparator],
			color: base_red
		},
		{
			tag: [tags.contentSeparator],
			color: base_yellow
		},
		{ tag: tags.invalid, color: base02, borderBottom: `1px dotted ${base_red}` }
	]);

	var editorOptions = {
		doc: options.value,
		parent: this.domNode,
		extensions: [
			dropCursor(),
			//Prec.high(oneDark),
			//Prec.high(syntaxHighlighting(highlightStyle)),
			//solarizedLightTheme,
			//syntaxHighlighting(solarizedLightHighlightStyle),
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
			history(),//{newGroupDelay: 0, joinToEvent: function() { return false; }}),
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
	console.log(operations);
	if(operations.type === "undo") {
		this.undo(this.cm);
	} else if(operations.type === "redo") {
		this.redo(this.cm);
	} else if(operations && operations.length) {
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
