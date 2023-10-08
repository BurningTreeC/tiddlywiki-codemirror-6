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
	var {EditorView,dropCursor,keymap,highlightSpecialChars,drawSelection,highlightActiveLine,rectangularSelection,crosshairCursor,lineNumbers,highlightActiveLineGutter,placeholder,tooltips} = CM["@codemirror/view"];
	var {defaultKeymap,standardKeymap,indentWithTab,history,historyKeymap,undo,redo} = CM["@codemirror/commands"];
	var {language,indentUnit,defaultHighlightStyle,syntaxHighlighting,syntaxTree,indentOnInput,bracketMatching,foldGutter,foldKeymap} = CM["@codemirror/language"];
	var {Extension,EditorState,Compartment,EditorSelection,Prec} = CM["@codemirror/state"];
	var {searchKeymap,highlightSelectionMatches,openSearchPanel,closeSearchPanel} = CM["@codemirror/search"];
	var {autocompletion,completionKeymap,closeBrackets,closeBracketsKeymap,completionStatus,acceptCompletion} = CM["@codemirror/autocomplete"];
	var {lintKeymap} = CM["@codemirror/lint"];

	var {Tree,Parser} = CM["@lezer/common"];

	this.editorSelection = EditorSelection;
	this.completionStatus = completionStatus;

	this.undo = undo;
	this.redo = redo;
	this.openSearchPanel = openSearchPanel;
	this.closeSearchPanel = closeSearchPanel;

	this.solarizedLightTheme = EditorView.theme({},{dark:false});
	this.solarizedDarkTheme = EditorView.theme({},{dark:true});

	var {styleTags,tags} = CM["@lezer/highlight"];
	var {HighlightStyle,TagStyle,syntaxHighlighting} = CM["@codemirror/language"];

	this.solarizedLightHighlightStyle = $tw.utils.codemirror.getSolarizedLightHighlightStyle(HighlightStyle,tags);
	this.solarizedDarkHighlightStyle = $tw.utils.codemirror.getSolarizedDarkHighlightStyle(HighlightStyle,tags);

	var solarizedTheme = this.widget.wiki.getTiddler(this.widget.wiki.getTiddlerText("$:/palette")).fields["color-scheme"] === "light" ? this.solarizedLightTheme : this.solarizedDarkTheme;
	var solarizedHighlightStyle = this.widget.wiki.getTiddler(this.widget.wiki.getTiddlerText("$:/palette")).fields["color-scheme"] === "light" ? this.solarizedLightHighlightStyle : this.solarizedDarkHighlightStyle;

	var {CompletionContext,completeAnyWord} = CM["@codemirror/autocomplete"];
	var completionMinLength = parseInt(this.widget.wiki.getTiddlerText("$:/config/codemirror-6/completionMinLength") || 3);
	var completeVariables = this.widget.wiki.getTiddlerText("$:/config/codemirror-6/completeVariables") === "yes";
	var completeWidgets = this.widget.wiki.getTiddlerText("$:/config/codemirror-6/completeWidgets") === "yes";
	var completeFilters = this.widget.wiki.getTiddlerText("$:/config/codemirror-6/completeFilters") === "yes";
	var autoOpenOnTyping = this.widget.wiki.getTiddlerText("$:/config/codemirror-6/autoOpenOnTyping") === "yes";

	this.tiddlerCompletionSource = function tiddlerCompletions(context = CompletionContext) {
		var matchBeforeRegex = self.widget.wiki.getTiddlerText("$:/config/codemirror-6/autocompleteRegex");
		var matchBeforePrefix = self.widget.wiki.getTiddlerText("$:/config/codemirror-6/autocompleteRegexPrefix").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		var prefixBefore = (matchBeforePrefix && (matchBeforePrefix !== "")) && $tw.utils.codemirror.validateRegex(matchBeforePrefix) ? context.matchBefore(new RegExp(matchBeforePrefix)) : null;
		var word = (matchBeforeRegex && (matchBeforeRegex !== "") && $tw.utils.codemirror.validateRegex(matchBeforeRegex)) ? context.matchBefore(new RegExp(matchBeforeRegex)) : context.matchBefore(/[\w-\/]*/); // /\w*/ or /[\w\s]+/
		var text = word ? word.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : "";
		var isFilterCompletion = ((context.matchBefore(new RegExp("\\[" + text)) !== null) || (context.matchBefore(new RegExp("\\]" + text)) !== null) || (context.matchBefore(new RegExp(">" + text)) !== null)),
			isWidgetCompletion = ((context.matchBefore(new RegExp("<\\$" + text)) !== null) || (context.matchBefore(new RegExp("<\\/\\$" + text)) !== null)),
			isVariableCompletion = ((context.matchBefore(new RegExp("<" + text)) !== null) || (context.matchBefore(new RegExp("<<" + text)) !== null)),
			isFilterrunPrefixCompletion = context.matchBefore(new RegExp(":" + text)) !== null;
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
		if(word && !prefixBefore && autoOpenOnTyping) {
			if ((word.text.length <= completionMinLength) && !context.explicit) { // || (word.from === word.to && !context.explicit)) { //(word.from === word.to && !context.explicit)) {
				return null;
			} else {
				return {
					from: word.from,
					options: self.getCompletionOptions(context,word,text,completeVariables,completeWidgets,completeFilters,isFilterCompletion,isWidgetCompletion,isVariableCompletion,isFilterrunPrefixCompletion) //filter: false
				}
			}
		} else if(context.explicit) {
			return {
				from: context.pos,
				options: self.getCompletionOptions(context,word,text,completeVariables,completeWidgets,completeFilters,isFilterCompletion,isWidgetCompletion,isVariableCompletion,isFilterrunPrefixCompletion)
			}
		} else if(prefixBefore) {
			var options = [];
			return {
				from: context.pos,
				options: self.getTiddlerCompletionOptions(options,context,word,text,completeVariables,completeWidgets,completeFilters,isFilterCompletion,isWidgetCompletion,isVariableCompletion,isFilterrunPrefixCompletion)
			}
		}
	};

	var selectOnOpen = this.widget.wiki.getTiddlerText("$:/config/codemirror-6/selectOnOpen") === "yes";

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
/*		tooltips({
			position: 'absolute' | 'fixed',
			parent: self.domNode.ownerDocument.body
		}),*/
		//basicSetup,
		highlightSpecialChars(),
		history(), //{newGroupDelay: 0, joinToEvent: function() { return false; }}),
		drawSelection(),
		EditorState.allowMultipleSelections.of(true),
		indentOnInput(),
		syntaxHighlighting(defaultHighlightStyle,{fallback: true}),
		autocompletion({tooltipClass: function() { return "cm-autocomplete-tooltip"}, selectOnOpen: selectOnOpen}), //{activateOnTyping: false, closeOnBlur: false}),
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
		}),
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

	if(this.widget.wiki.getTiddlerText("$:/config/codemirror-6/closeBrackets") === "yes") {
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

	var cmIndentUnit = "	";
	editorExtensions.push(indentUnit.of(cmIndentUnit));

	var mode = this.widget.editType;
	if(mode === "") {
		mode = "text/vnd.tiddlywiki";
	}
	switch(mode) {
		case "text/vnd.tiddlywiki":
			var {tiddlywiki,tiddlywikiLanguage} = CM["@codemirror/lang-tiddlywiki"];
			editorExtensions.push(tiddlywiki());
			var docCompletions = tiddlywikiLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
			editorExtensions.push(Prec.high(docCompletions));
			break;
		case "text/html":
			var {html,htmlLanguage} = CM["@codemirror/lang-html"];
			editorExtensions.push(html({selfClosingTags: true}));
			var docCompletions = htmlLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
			editorExtensions.push(Prec.high(docCompletions));
			break;
		case "application/javascript":
			var {javascript,javascriptLanguage,scopeCompletionSource} = CM["@codemirror/lang-javascript"];
			editorExtensions.push(javascript());
			var docCompletions = javascriptLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
			editorExtensions.push(Prec.high(docCompletions));
			/*editorExtensions.push(
				javascriptLanguage.data.of({
					autocomplete: scopeCompletionSource(globalThis)//self.domNode.ownerDocument.defaultView)
				})
			);*/
			break;
		case "application/json":
			var {json,jsonLanguage} = CM["@codemirror/lang-json"];
			editorExtensions.push(json());
			break;
		case "text/css":
			var {css,cssLanguage} = CM["@codemirror/lang-css"];
			editorExtensions.push(css());
			var docCompletions = cssLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
			editorExtensions.push(Prec.high(docCompletions));
			break;
		case "text/markdown":
		case "text/x-markdown":
			var {markdown,markdownLanguage,markdownKeymap} = CM["@codemirror/lang-markdown"];
			editorExtensions.push(markdown({base: markdownLanguage}));
			var docCompletions = markdownLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
			editorExtensions.push(Prec.high(docCompletions));
			editorExtensions.push(Prec.high(keymap.of(markdownKeymap)));
			break;
		default:
			break;
	};
	var state = EditorState.create({doc: options.value,extensions: editorExtensions});
	var editorOptions = {
		parent: this.domNode,
		state: state
	};
	this.cm = new EditorView(editorOptions);
};

CodeMirrorEngine.prototype.getTiddlerCompletionOptions = function(options,context,word,text,completeVariables,completeWidgets,completeFilters,isFilterCompletion,isWidgetCompletion,isVariableCompletion,isFilterrunPrefixCompletion) {
	var self = this;
	var tiddlers = this.widget.wiki.filterTiddlers(this.widget.wiki.getTiddlerText("$:/config/codemirror-6/autocompleteTiddlerFilter"));
	var matchBeforeSystem = context.matchBefore(new RegExp("\\$:/" + text));
	var matchBeforeSystemAlmost = context.matchBefore(new RegExp("\\$:" + text));
	var matchBeforeDollar = context.matchBefore(new RegExp("\\$" + text));
	var matchBeforeBrackets = context.matchBefore(new RegExp("\\[\\[" + text));
	$tw.utils.each(tiddlers,function(tiddler) {
		options.push({label: tiddler, type: "cm-tiddler", boost: 99, apply: function(view,completion,from,to) {
			var applyFrom,
				applyTo,
				apply;
			if(matchBeforeSystem && completion.label.startsWith("$:/")) {
				applyFrom = from - 3;
				apply = completion.label;
			} else if(matchBeforeSystemAlmost && completion.label.startsWith("$:/")) {
				applyFrom = from - 2;
				apply = completion.label;
			} else if(matchBeforeDollar && completion.label.startsWith("$:/")) {
				applyFrom = from - 1;
				apply = completion.label;
			} else if(matchBeforeBrackets) {
				applyFrom = from;
				apply = completion.label + "]]";
			} else {
				applyFrom = from;
				apply = completion.label;
			}
			applyTo = applyFrom + apply.length;
			view.dispatch(view.state.changeByRange(function(range) {
				var editorChanges = [{from:  applyFrom, to: to, insert: apply}];
				var selectionRange = self.editorSelection.range(applyTo,applyTo);
				return {
					changes: editorChanges,
					range: selectionRange
				}
			}));
		}}); //section: "Tiddlers"
	});
	return options;
};

CodeMirrorEngine.prototype.getCompletionOptions = function(context,word,text,completeVariables,completeWidgets,completeFilters,isFilterCompletion,isWidgetCompletion,isVariableCompletion,isFilterrunPrefixCompletion) {
	var self = this;
	var options = [];
	this.getTiddlerCompletionOptions(options,context,word,text,completeVariables,completeWidgets,completeFilters,isFilterCompletion,isWidgetCompletion,isVariableCompletion,isFilterrunPrefixCompletion)
	if(completeVariables && isVariableCompletion && !isFilterrunPrefixCompletion && !isWidgetCompletion) {
		var variableNames = [];
		var widget = this.widget;
		while(widget && !widget.hasOwnProperty("variables")) {
			widget = widget.parentWidget;
		}
		if(widget && widget.variables) {
			for(var variable in widget.variables) {
				variableNames.push(variable);
			}
		}
		var matchBeforeDouble = context.matchBefore(new RegExp("<<" + text));
		var matchBeforeSingle = context.matchBefore(new RegExp("<" + text));
		$tw.utils.each(variableNames,function(variableName) {
			options.push({label: variableName, displayLabel: "<<" + variableName + ">>", type: "cm-variable", boost: 99, apply: function(view,completion,from,to) {
				var applyFrom,
					applyTo,
					apply;
				if(matchBeforeSingle && !matchBeforeDouble) {
					applyFrom = from - 1;
					apply = "<" + completion.label + ">";
				} else if(matchBeforeDouble) {
					applyFrom = from - 2;
					apply = "<<" + completion.label + ">>"
				} else {
					applyFrom = from;
					apply = "<<" + completion.label + ">>"
				}
				applyTo = applyFrom + apply.length;
				view.dispatch(view.state.changeByRange(function(range) {
					var editorChanges = [{from:  applyFrom, to: to, insert: apply}];
					var selectionRange = self.editorSelection.range(applyTo,applyTo);
					return {
						changes: editorChanges,
						range: selectionRange
					}
				}));
			}});
		});
	}
	if(completeWidgets && isWidgetCompletion) {
		var widgetNames = [];
		$tw.utils.each($tw.modules.types["widget"],function(widget) {
			var widgetName = Object.getOwnPropertyNames(widget.exports);
			$tw.utils.each(widgetName,function(name) {
				widgetNames.push(name);
			});
		});
		var matchBeforeOpeningRegex = new RegExp("<\\$" + text);
		var matchBeforeClosingRegex = new RegExp("<\\/\\$" + text);
		var matchBeforeOpening = context.matchBefore(matchBeforeOpeningRegex);
		var matchBeforeClosing = context.matchBefore(matchBeforeClosingRegex);
		$tw.utils.each(widgetNames,function(widgetName) {
			options.push({label: widgetName, displayLabel: "<$" + widgetName + ">", type: "cm-widget", boost: 99, apply: function(view,completion,from,to) {
				var applyFrom,
					applyTo,
					apply;
				if(matchBeforeOpening) {
					applyFrom = from;
					apply = completion.label + " >";
					applyTo = applyFrom + apply.length - 1;
				} else if(matchBeforeClosing) {
					applyFrom = from;
					apply = completion.label + ">"
					applyTo = applyFrom + apply.length;
				} else {
					applyFrom = from;
					apply = "<$" + completion.label + " >";
					applyTo = applyFrom + apply.length;
				}
				view.dispatch(view.state.changeByRange(function(range) {
					var editorChanges = [{from: applyFrom, to: to, insert: apply}];
					var selectionRange = self.editorSelection.range(applyTo,applyTo);
					return {
						changes: editorChanges,
						range: selectionRange
					}
				}));
			}});
		});
	}
	if(completeFilters && isFilterCompletion && !isFilterrunPrefixCompletion && !isWidgetCompletion && !isVariableCompletion) {
		var filterNames = [];
		$tw.utils.each($tw.modules.types["filteroperator"],function(filteroperator) {
			var filterName = Object.getOwnPropertyNames(filteroperator.exports);
			$tw.utils.each(filterName,function(name) {
				filterNames.push(name);
			});
		});
		$tw.utils.each(filterNames,function(filterName) {
			options.push({label: filterName + "[]", type: "cm-filter", boost: 99, apply: function(view,completion,from,to) {
				view.dispatch(view.state.changeByRange(function(range) {
					var editorChanges = [{from: from, to: to, insert: completion.label}];
					var selectionRange = self.editorSelection.range(from + completion.label.length - 1,from + completion.label.length - 1);
					return {
						changes: editorChanges,
						range: selectionRange
					}
				}));
			}});
		});
	}
	if(completeFilters && isFilterrunPrefixCompletion && !isWidgetCompletion && !isFilterCompletion && !isVariableCompletion) {
		var filterPrefixNames = [];
		$tw.utils.each($tw.modules.types["filterrunprefix"],function(filterrunprefix) {
			var filterRunPrefixName = Object.getOwnPropertyNames(filterrunprefix.exports);
			$tw.utils.each(filterRunPrefixName,function(name) {
				filterPrefixNames.push(name);
			});
		});
		var matchBefore = context.matchBefore(new RegExp(":" + text));
		$tw.utils.each(filterPrefixNames,function(filterPrefixName) {
			options.push({label: filterPrefixName, displayLabel: ":" + filterPrefixName + "[]", type: "cm-filterrunprefix", boost: 99, apply: function(view,completion,from,to) {
				view.dispatch(view.state.changeByRange(function(range) {
					var applyFrom,
						applyTo,
						apply;
					if(matchBefore) {
						applyFrom = from;
						apply = completion.label + "[]";
					} else {
						applyFrom = from;
						apply = ":" + completion.label + "[]";
					}
					applyTo = applyFrom + apply.length - 1;
					var editorChanges = [{from: applyFrom, to: to, insert: apply}];
					var selectionRange = self.editorSelection.range(applyTo,applyTo);
					return {
						changes: editorChanges,
						range: selectionRange
					}
				}));
			}});
		});
	}
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
	//var {Compartment} = CM["@codemirror/state"];
	//var languageCompartment = new Compartment();
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
