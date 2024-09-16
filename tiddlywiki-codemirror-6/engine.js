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

	var {EditorView,dropCursor,keymap,highlightSpecialChars,drawSelection,highlightActiveLine,rectangularSelection,crosshairCursor,lineNumbers,highlightActiveLineGutter,placeholder,tooltips} = CM["@codemirror/view"];
	var {defaultKeymap,standardKeymap,indentWithTab,history,historyKeymap,undo,redo} = CM["@codemirror/commands"];
	var {indentUnit,defaultHighlightStyle,syntaxHighlighting,indentOnInput,bracketMatching,foldGutter,foldKeymap} = CM["@codemirror/language"];
	var {EditorState,EditorSelection,Prec} = CM["@codemirror/state"];
	var {search,SearchQuery,searchKeymap,highlightSelectionMatches,openSearchPanel,closeSearchPanel,searchPanelOpen} = CM["@codemirror/search"];
	var {autocompletion,completionKeymap,closeBrackets,closeBracketsKeymap,completionStatus,acceptCompletion,completeAnyWord} = CM["@codemirror/autocomplete"];
	var {lintKeymap} = CM["@codemirror/lint"];

	this.editorSelection = EditorSelection;
	this.completionStatus = completionStatus;

	this.undo = undo;
	this.redo = redo;
	this.openSearchPanel = openSearchPanel;

	var cSP = function() {
		closeSearchPanel(self.cm);
	};
	this.closeSearchPanel = function() {
		var deleteTiddler = self.widget.getVariable("qualifiedSearchPanelState");
		self.widget.wiki.deleteTiddler(deleteTiddler);
		cSP();
	};

	this.solarizedLightTheme = EditorView.theme({},{dark:false});
	this.solarizedDarkTheme = EditorView.theme({},{dark:true});

	var {tags} = CM["@lezer/highlight"];
	var {HighlightStyle,syntaxHighlighting} = CM["@codemirror/language"];

	this.solarizedLightHighlightStyle = $tw.utils.codemirror.getSolarizedLightHighlightStyle(HighlightStyle,tags);
	this.solarizedDarkHighlightStyle = $tw.utils.codemirror.getSolarizedDarkHighlightStyle(HighlightStyle,tags);

	var solarizedTheme = this.widget.wiki.getTiddler(this.widget.wiki.getTiddlerText("$:/palette")).fields["color-scheme"] === "light" ? this.solarizedLightTheme : this.solarizedDarkTheme;
	var solarizedHighlightStyle = this.widget.wiki.getTiddler(this.widget.wiki.getTiddlerText("$:/palette")).fields["color-scheme"] === "light" ? this.solarizedLightHighlightStyle : this.solarizedDarkHighlightStyle;

	var autoCloseBrackets = this.widget.wiki.getTiddlerText("$:/config/codemirror-6/closeBrackets") === "yes";

	this.actionCompletionSource = function(context) {
		var actionTiddlers = self.widget.wiki.filterTiddlers("[all[tiddlers+shadows]tag[$:/tags/CodeMirror/Action]!is[draft]]");
		var actionStrings = [];
		var actions = [];
		$tw.utils.each(actionTiddlers,function(actionTiddler) {
			var tiddler = self.widget.wiki.getTiddler(actionTiddler);
			actionStrings.push(tiddler.fields.string);
			actions.push(tiddler.fields.text);
		});
		$tw.utils.each(actionStrings,function(actionString) {
			var actionStringEscaped = actionString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			var regex = $tw.utils.codemirror.validateRegex(actionStringEscaped) ? new RegExp(actionStringEscaped) : null;
			if(regex) {
				var stringContext = context.matchBefore(regex);
				if(stringContext) {
					var string = stringContext.text;
					var index = actionStrings.indexOf(string);
					if(index !== -1) {
						self.cm.dispatch({changes: {from: stringContext.from, to: stringContext.to, insert: ""}});
						self.widget.invokeActionString(actions[index],self,undefined,self.widget.variables);
					}
				}
			}
		});
	};

	this.tiddlerCompletionSource = function(context) {
		var delimiter = self.widget.wiki.getTiddlerText("$:/config/codemirror-6/tiddlerMatchDelimiter");
		var delimiterRegex = $tw.utils.codemirror.validateRegex(delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) ? new RegExp(delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : null;
		if(delimiterRegex) {
			var followingRegex = new RegExp("[^\\\s]*");
			var completeRegex = new RegExp(delimiterRegex.source + followingRegex.source);
			var completeMatch = context.matchBefore(completeRegex);
			if(completeMatch) {
				var tiddlers = self.widget.wiki.filterTiddlers(self.widget.wiki.getTiddlerText("$:/config/codemirror-6/tiddlerFilter"));
				var userTiddlers = self.widget.wiki.filterTiddlers("[all[tiddlers+shadows]tag[$:/tags/CodeMirror/AutoComplete]!is[draft]]");
				var userCompletions = [];
				$tw.utils.each(userTiddlers,function(userTiddler) {
					var userCompletion = self.widget.wiki.getTiddlerText(userTiddler);
					userCompletions.push(userCompletion);
				});
				return {
					from: completeMatch.from + delimiter.length,
					options: self.getTiddlerCompletionOptions(tiddlers,userCompletions,completeMatch.text.length - (completeMatch.text.length - delimiter.length))
				}
			}
		}
	};

	var selectOnOpen = this.widget.wiki.getTiddlerText("$:/config/codemirror-6/selectOnOpen") === "yes";
	var autocompleteIcons = this.widget.wiki.getTiddlerText("$:/config/codemirror-6/autocompleteIcons") === "yes";
	var maxRenderedOptions = parseInt(this.widget.wiki.getTiddlerText("$:/config/codemirror-6/maxRenderedOptions"));

	var editorExtensions = [
		dropCursor(),
		solarizedTheme,
		Prec.high(syntaxHighlighting(solarizedHighlightStyle)),
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
				if(self.widget.isFileDropEnabled && ($tw.utils.dragEventContainsFiles(event) || event.dataTransfer.files.length)) {
					event.preventDefault();
					return true;
				}
				return false;
			},
			dragover(event,view) {
				self.dragCancel = true;
				if(self.widget.isFileDropEnabled && ($tw.utils.dragEventContainsFiles(event) || event.dataTransfer.files.length)) {
					event.preventDefault();
					return true;
				}
				return false;
			},
			dragleave(event,view) {
				self.dragCancel = false;
				if(self.widget.isFileDropEnabled) {
					event.preventDefault();
					return true;
				}
				return false;
			},
			dragend(event,view) {
				self.dragCancel = true;
				if(self.widget.isFileDropEnabled) {
					//event.preventDefault();
					//return true;
				}
				return false;
			},
			paste(event,view) {
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
				if(self.widget.editCancelPopups) {
					$tw.popup.cancel(0);
				}
				return false;
			},
			blur(event,view) {
				return false;
			}
		})),
		tooltips({
			parent: self.domNode.ownerDocument.body
		}),
		search(),
		highlightSpecialChars(),
		history(), //{newGroupDelay: 0, joinToEvent: function() { return false; }}),
		drawSelection(),
		EditorState.allowMultipleSelections.of(true),
		indentOnInput(),
		syntaxHighlighting(defaultHighlightStyle,{fallback: true}),
		autocompletion({tooltipClass: function() { return "cm-autocomplete-tooltip" }, selectOnOpen: selectOnOpen, icons: autocompleteIcons, maxRenderedOptions: maxRenderedOptions}), //{activateOnTyping: false, closeOnBlur: false}),
		rectangularSelection(),
		crosshairCursor(),
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
		Prec.high(keymap.of({key: "Tab", run: acceptCompletion})),
		EditorView.lineWrapping,
		EditorView.contentAttributes.of({tabindex: self.widget.editTabIndex ? self.widget.editTabIndex : ""}),
		EditorView.contentAttributes.of({spellcheck: self.widget.wiki.getTiddlerText("$:/config/codemirror-6/spellcheck") === "yes"}),
		EditorView.contentAttributes.of({autocorrect: self.widget.wiki.getTiddlerText("$:/config/codemirror-6/autocorrect") === "yes"}),
		EditorView.contentAttributes.of({translate: self.widget.wiki.getTiddlerText("$:/state/codemirror-6/translate/" + self.widget.editTitle) === "yes" ? "yes" : "no"}),
		EditorView.perLineTextDirection.of(true),
		EditorView.updateListener.of(function(v) {
			if(v.docChanged) {
				var text = self.cm.state.doc.toString();
				self.widget.saveChanges(text);
			}
		})
	];

	if(this.widget.wiki.getTiddlerText("$:/config/codemirror-6/indentWithTab") === "yes") {
		editorExtensions.push(
			keymap.of([
				indentWithTab
			])
		);
	};

	if(this.widget.wiki.getTiddlerText("$:/config/codemirror-6/completeAnyWord") === "yes") {
		editorExtensions.push(EditorState.languageData.of(function() { return [{autocomplete: completeAnyWord}]; }));
	};

	if(autoCloseBrackets) {
		editorExtensions.push(closeBrackets());
	};

	if(this.widget.wiki.getTiddlerText("$:/config/codemirror-6/bracketMatching") === "yes") {
		editorExtensions.push(bracketMatching());
	};

	if(this.widget.wiki.getTiddlerText("$:/config/codemirror-6/lineNumbers") === "yes") {
		editorExtensions.push(lineNumbers());
		editorExtensions.push(foldGutter());
	};

	if(this.widget.wiki.getTiddlerText("$:/config/codemirror-6/highlightActiveLine") === "yes") {
		editorExtensions.push(highlightActiveLine());
		editorExtensions.push(highlightActiveLineGutter());
	};

	if(this.widget.editPlaceholder) {
		editorExtensions.push(placeholder(self.widget.editPlaceholder));
	};

	var cmIndentUnit = "",
		cmIndentUnitValue;
	var indentUnitValue = this.widget.wiki.getTiddlerText("$:/config/codemirror-6/indentUnit");
	switch(indentUnitValue) {
		case "spaces":
			cmIndentUnitValue = " ";
			break;
		case "tabs":
			cmIndentUnitValue = "	";
			break;
		default:
			cmIndentUnitValue = "	";
			break;
	};
	var indentUnitMultiplier = parseInt(this.widget.wiki.getTiddlerText("$:/config/codemirror-6/indentUnitMultiplier"));
	for(var i=0; i<indentUnitMultiplier; i++) {
		cmIndentUnit += cmIndentUnitValue;
	}
	editorExtensions.push(indentUnit.of(cmIndentUnit));

	var mode = this.widget.editType;
	if(mode === "") {
		mode = "text/vnd.tiddlywiki";
	}
	switch(mode) {
		case "text/vnd.tiddlywiki":
			var {tiddlywiki,tiddlywikiLanguage} = CM["@codemirror/lang-tiddlywiki"];
			editorExtensions.push(tiddlywiki());
			var actionCompletions = tiddlywikiLanguage.data.of({autocomplete: this.actionCompletionSource});
			var tiddlerCompletions = tiddlywikiLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
			editorExtensions.push(Prec.high(actionCompletions));
			editorExtensions.push(Prec.high(tiddlerCompletions));
			break;
		case "text/html":
			var {html,htmlLanguage} = CM["@codemirror/lang-html"];
			editorExtensions.push(html({selfClosingTags: true}));
			var actionCompletions = htmlLanguage.data.of({autocomplete: this.actionCompletionSource});
			var tiddlerCompletions = htmlLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
			editorExtensions.push(Prec.high(actionCompletions));
			editorExtensions.push(Prec.high(tiddlerCompletions));
			break;
		case "application/javascript":
			var {javascript,javascriptLanguage,scopeCompletionSource} = CM["@codemirror/lang-javascript"];
			editorExtensions.push(javascript());
			var actionCompletions = javascriptLanguage.data.of({autocomplete: this.actionCompletionSource});
			var tiddlerCompletions = javascriptLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
			editorExtensions.push(Prec.high(actionCompletions));
			editorExtensions.push(Prec.high(tiddlerCompletions));
			/*editorExtensions.push(
				javascriptLanguage.data.of({
					autocomplete: scopeCompletionSource(globalThis)
				})
			);*/
			break;
		case "application/json":
			var {json,jsonLanguage} = CM["@codemirror/lang-json"];
			editorExtensions.push(json());
			var actionCompletions = jsonLanguage.data.of({autocomplete: this.actionCompletionSource});
			var tiddlerCompletions = jsonLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
			editorExtensions.push(Prec.high(actionCompletions));
			editorExtensions.push(Prec.high(tiddlerCompletions));
			break;
		case "text/css":
			var {css,cssLanguage} = CM["@codemirror/lang-css"];
			editorExtensions.push(css());
			var actionCompletions = cssLanguage.data.of({autocomplete: this.actionCompletionSource});
			var tiddlerCompletions = cssLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
			editorExtensions.push(Prec.high(actionCompletions));
			editorExtensions.push(Prec.high(tiddlerCompletions));
			break;
		case "text/markdown":
		case "text/x-markdown":
			var {markdown,markdownLanguage,markdownKeymap} = CM["@codemirror/lang-markdown"];
			editorExtensions.push(markdown({base: markdownLanguage}));
			var actionCompletions = markdownLanguage.data.of({autocomplete: this.actionCompletionSource});
			var tiddlerCompletions = markdownLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
			editorExtensions.push(Prec.high(actionCompletions));
			editorExtensions.push(Prec.high(tiddlerCompletions));
			editorExtensions.push(Prec.high(keymap.of(markdownKeymap)));
			break;
		case "text/python":
			var {python,pythonLanguage} = CM["@codemirror/lang-python"];
			editorExtensions.push(python());
			var actionCompletions = pythonLanguage.data.of({autocomplete: this.actionCompletionSource});
			var tiddlerCompletions = pythonLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
			editorExtensions.push(Prec.high(actionCompletions));
			editorExtensions.push(Prec.high(tiddlerCompletions));
			break;
		case "text/php":
			var {php,phpLanguage} = CM["@codemirror/lang-php"];
			editorExtensions.push(php());
			var actionCompletions = phpLanguage.data.of({autocomplete: this.actionCompletionSource});
			var tiddlerCompletions = phpLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
			editorExtensions.push(Prec.high(actionCompletions));
			editorExtensions.push(Prec.high(tiddlerCompletions));
			break;
		case "text/rust":
			var {rust,rustLanguage} = CM["@codemirror/lang-rust"];
			editorExtensions.push(rust());
			var actionCompletions = rustLanguage.data.of({autocomplete: this.actionCompletionSource});
			var tiddlerCompletions = rustLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
			editorExtensions.push(Prec.high(actionCompletions));
			editorExtensions.push(Prec.high(tiddlerCompletions));
			break;
		case "text/yaml":
			var {yaml,yamlLanguage} = CM["@codemirror/lang-yaml"];
			editorExtensions.push(yaml());
			var actionCompletions = yamlLanguage.data.of({autocomplete: this.actionCompletionSource});
			var tiddlerCompletions = yamlLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
			editorExtensions.push(Prec.high(actionCompletions));
			editorExtensions.push(Prec.high(tiddlerCompletions));
			break;
		case "text/go":
			var {go,goLanguage} = CM["@codemirror/lang-go"];
			editorExtensions.push(go());
			var actionCompletions = goLanguage.data.of({autocomplete: this.actionCompletionSource});
			var tiddlerCompletions = goLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
			editorExtensions.push(Prec.high(actionCompletions));
			editorExtensions.push(Prec.high(tiddlerCompletions));
			break;
		case "text/cpp":
			var {cpp,cppLanguage} = CM["@codemirror/lang-cpp"];
			editorExtensions.push(cpp());
			var actionCompletions = cppLanguage.data.of({autocomplete: this.actionCompletionSource});
			var tiddlerCompletions = cppLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
			editorExtensions.push(Prec.high(actionCompletions));
			editorExtensions.push(Prec.high(tiddlerCompletions));
			break;
		case "text/xml":
			var {xml,xmlLanguage} = CM["@codemirror/lang-xml"];
			editorExtensions.push(xml());
			var actionCompletions = xmlLanguage.data.of({autocomplete: this.actionCompletionSource});
			var tiddlerCompletions = xmlLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
			editorExtensions.push(Prec.high(actionCompletions));
			editorExtensions.push(Prec.high(tiddlerCompletions));
			break;
		case "text/sql":
			var {sql,StandardSQL,PostgreSQL,MySQL,MariaSQL,MSSQL,SQLite,Cassandra,PLSQL} = CM["@codemirror/lang-sql"];
			editorExtensions.push(sql({ dialect: StandardSQL }));
			var actionCompletions = StandardSQL.language.data.of({autocomplete: this.actionCompletionSource});
			var tiddlerCompletions = StandardSQL.language.data.of({autocomplete: this.tiddlerCompletionSource});
			editorExtensions.push(Prec.high(actionCompletions));
			editorExtensions.push(Prec.high(tiddlerCompletions));
			break;
		default:
			break;
	};
	this.editorState = EditorState.create({doc: options.value,extensions: editorExtensions});
	var editorOptions = {
		parent: this.domNode,
		state: this.editorState
	};
	this.cm = new EditorView(editorOptions);
};

CodeMirrorEngine.prototype.getTiddlerCompletionOptions = function(tiddlers,userCompletions,prefixLength) {
	var self = this;
	var options = [];
	function applyCompletion(view,completion,from,to) {
		var applyFrom = from - prefixLength;
		var apply = completion.label;
		var applyTo = applyFrom + completion.label.length;
		view.dispatch(view.state.changeByRange(function(range) {
			var editorChanges = [{from:  applyFrom, to: to, insert: apply}];
			var selectionRange = self.editorSelection.range(applyTo,applyTo);
			return {
				changes: editorChanges,
				range: selectionRange
			}
		}));
	}
	$tw.utils.each(tiddlers,function(tiddler) {
		options.push({label: tiddler, type: "cm-tiddler", boost: 99, apply: function(view,completion,from,to) {
			applyCompletion(view,completion,from,to);
		}});
	});
	$tw.utils.each(userCompletions,function(userCompletion) {
		options.push({label: userCompletion, type: "cm-user-completion", boost: 99, apply: function(view,completion,from,to) {
			applyCompletion(view,completion,from,to);
		}});
	});
	return options;
};

CodeMirrorEngine.prototype.handleDropEvent = function(event,view) {
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
	if((event.keyCode === 27) && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && (this.completionStatus(this.cm.state) === "active")) {
		event.stopPropagation();
		return false;
	}
	if((event.keyCode === 27) && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && this.closeSearchPanel(this.cm)) {
		var deleteTiddler = this.widget.getVariable("qualifiedSearchPanelState");
		this.widget.wiki.deleteTiddler(deleteTiddler);
		event.stopPropagation();
		return false;
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
	this.cm.requestMeasure();
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
CodeMirrorEngine.prototype.createTextOperation = function(type) {
	var selections = this.cm.state.selection.ranges;
	var operations;
	switch(type) {
	case ("excise"):
	case ("focus-editor"):
	case ("insert-text"):
	case ("make-link"):
	case ("prefix-lines"):
	case ("redo"):
	case ("replace-all"):
	case ("replace-selection"):
	case ("save-selection"):
	case ("search"):
	case ("undo"):
	case ("wrap-lines"):
	case ("wrap-selection"):
		operations = [];
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
		break;
	default:
		operations = {
			text: this.cm.state.doc.toString(),
			selStart: selections[0].from,
			selEnd: selections[0].to,
			cutStart: null,
			cutEnd: null,
			replacement: null,
			newSelStart: null,
			newSelEnd: null
		}
		break;
	}
	return operations;
};

/*
Execute a text operation
*/
CodeMirrorEngine.prototype.executeTextOperation = function(operations) {
	var self = this;
	if(operations.type && (operations.type === "undo")) {
		this.undo(this.cm);
	} else if(operations.type && (operations.type === "redo")) {
		this.redo(this.cm);
	} else if(operations.type && (operations.type === "search")) {
		this.closeSearchPanel(this.cm) || this.openSearchPanel(this.cm);
	} else if((operations.type !== "focus-editor") && operations && operations.length) {
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
	} else if(operations.type !== "focus-editor" && operations && operations.cutStart && operations.cutEnd && operations.newSelStart && operations.newSelEnd && operations.replacement) {
		this.cm.dispatch(this.cm.state.changeByRange(function(range) {
			var editorChanges = [{from: operations.cutStart, to: operations.cutEnd, insert: operations.replacement}];
			var selectionRange = self.editorSelection.range(operations.newSelStart,operations.newSelEnd);
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
