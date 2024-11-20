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
	//this.domNode.style.display = "inline-block";
	this.parentNode.insertBefore(this.domNode,this.nextSibling);
	this.widget.domNodes.push(this.domNode);

	var {EditorView,ViewPlugin,dropCursor,keymap,highlightSpecialChars,drawSelection,highlightActiveLine,rectangularSelection,crosshairCursor,lineNumbers,highlightActiveLineGutter,placeholder,tooltips,showPanel,getPanel} = CM["@codemirror/view"];
	var {defaultKeymap,standardKeymap,indentWithTab,history,historyKeymap,undo,redo} = CM["@codemirror/commands"];
	var {indentUnit,defaultHighlightStyle,syntaxHighlighting,indentOnInput,bracketMatching,foldGutter,foldKeymap} = CM["@codemirror/language"];
	var {EditorState,EditorSelection,Prec,Facet,StateField,StateEffect,Compartment} = CM["@codemirror/state"];
	var {search,SearchQuery,searchKeymap,highlightSelectionMatches,openSearchPanel,closeSearchPanel,searchPanelOpen,gotoLine} = CM["@codemirror/search"];
	var {autocompletion,completionKeymap,closeBrackets,closeBracketsKeymap,completionStatus,acceptCompletion,completeAnyWord} = CM["@codemirror/autocomplete"];
	var {lintKeymap} = CM["@codemirror/lint"];
	var {tiddlywiki,tiddlywikiLanguage} = CM["@codemirror/lang-tiddlywiki"];

	this.EditorView = EditorView;
	this.EditorState = EditorState;
	this.Prec = Prec;
	this.keymap = keymap;

	var keymapCompartment = new Compartment();
	var languageCompartment = new Compartment();
	var actionCompletionsCompartment = new Compartment();
	var tiddlerCompletionsCompartment = new Compartment();

	this.editorSelection = EditorSelection;
	this.completionStatus = completionStatus;

	this.undo = undo;
	this.redo = redo;

	this.showPanel = showPanel;
	this.getPanel = getPanel;

	this.customKeymap = [];
	this.markdownKeymap = [];
	this.indentWithTab = indentWithTab;

	this.previousPanelState = [];
	this.previousFocusState = false;
	this.cancelEditTiddlerStateTiddler = this.widget.getVariable("cancelEditTiddlerStateTiddler");

	var cmCloseBracketsKeymap = closeBracketsKeymap,
		cmDefaultKeymap = defaultKeymap,
		cmSearchKeymap = searchKeymap,
		cmHistoryKeymap = historyKeymap,
		cmFoldKeymap = foldKeymap,
		cmCompletionKeymap = completionKeymap,
		cmLintKeymap = lintKeymap;

	var oSP = function() {
		return openSearchPanel(self.cm);
	}
	var cSP = function() {
		return closeSearchPanel(self.cm);
	};
	this.openSearchPanel = function() {
		return oSP();
	}
	this.closeSearchPanel = function() {
		return cSP();
	};

	this.searchPanelOpen = searchPanelOpen;

	this.editorPanelState = [];

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
				var tiddlerCompletions = [];
				var tiddlerCaptions = [];
				$tw.utils.each(tiddlers,function(tiddler) {
					var tid = self.widget.wiki.getTiddler(tiddler);
					var tiddlerCompletion = tid.fields.title;
					tiddlerCompletions.push(tiddlerCompletion);
					var tiddlerCaption = tid.fields.caption || tiddlerCompletion;
					tiddlerCaptions.push(tiddlerCaption);
				});
				var userTiddlers = self.widget.wiki.filterTiddlers("[all[tiddlers+shadows]tag[$:/tags/CodeMirror/AutoComplete]!is[draft]]");
				var userSnippets = self.widget.wiki.filterTiddlers("[all[tiddlers+shadows]tag[$:/tags/CodeMirror/Snippet]!is[draft]]");
				var userCompletions = [];
				var userDescriptions = [];
				$tw.utils.each(userTiddlers,function(userTiddler) {
					var tiddler = self.widget.wiki.getTiddler(userTiddler);
					var userCompletion = tiddler.fields.text;
					userCompletions.push(userCompletion);
					var userDescription = tiddler.fields.description || userCompletion;
					userDescriptions.push(userDescription);
				});
				$tw.utils.each(userSnippets,function(userSnippet) {
					var tiddler = self.widget.wiki.getTiddler(userSnippet);
					var userCompletion = tiddler.fields.text;
					userCompletions.push(userCompletion);
					var userDescription = tiddler.fields.description || userCompletion;
					userDescriptions.push(userDescription);
				});
				return {
					from: completeMatch.from + delimiter.length,
					options: self.getTiddlerCompletionOptions(tiddlers,tiddlerCaptions,userCompletions,userDescriptions,completeMatch.text.length - (completeMatch.text.length - delimiter.length))
				}
			}
		}
	};

	if(this.widget.wiki.getTiddlerText("$:/config/codemirror-6/indentWithTab") === "yes") {
		this.customKeymap.push(indentWithTab);
	};

	var selectOnOpen = this.widget.wiki.getTiddlerText("$:/config/codemirror-6/selectOnOpen") === "yes";
	var autocompleteIcons = this.widget.wiki.getTiddlerText("$:/config/codemirror-6/autocompleteIcons") === "yes";
	var maxRenderedOptions = parseInt(this.widget.wiki.getTiddlerText("$:/config/codemirror-6/maxRenderedOptions"));

	var actionCompletions = tiddlywikiLanguage.data.of({autocomplete: this.actionCompletionSource});
	var tiddlerCompletions = tiddlywikiLanguage.data.of({autocomplete: this.tiddlerCompletionSource});

	var editorExtensions = [
		languageCompartment.of(tiddlywiki()),
		actionCompletionsCompartment.of(actionCompletions),
		tiddlerCompletionsCompartment.of(tiddlerCompletions),
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
					event.stopPropagation();
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
			//parent: self.domNode.ownerDocument.body
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
		keymapCompartment.of(keymap.of([
			...cmCloseBracketsKeymap,
			...cmDefaultKeymap,
			...cmSearchKeymap,
			...cmHistoryKeymap,
			...cmFoldKeymap,
			...cmCompletionKeymap,
			...cmLintKeymap,
			...self.markdownKeymap,
			...self.customKeymap
		])),
		Prec.high(keymap.of({key: "Tab", run: acceptCompletion})),
		EditorView.lineWrapping,
		EditorView.contentAttributes.of({tabindex: self.widget.editTabIndex ? self.widget.editTabIndex : ""}),
		EditorView.contentAttributes.of({spellcheck: self.widget.wiki.getTiddlerText("$:/config/codemirror-6/spellcheck") === "yes"}),
		EditorView.contentAttributes.of({autocorrect: self.widget.wiki.getTiddlerText("$:/config/codemirror-6/autocorrect") === "yes"}),
		EditorView.contentAttributes.of({translate: self.widget.wiki.getTiddlerText("$:/state/codemirror-6/translate/" + self.widget.editTitle) === "yes" ? "yes" : "no"}),
		EditorView.perLineTextDirection.of(true),
		EditorView.updateListener.of(function(update) {
			if(update.docChanged) {
				var text = self.cm.state.doc.toString();
				self.widget.saveChanges(text);
			}
			var panelState = update.view.state.facet(showPanel);
			var panelStateLength = self.countPanelStateLength(panelState);
			var lineDialogOpen = false;
			if(panelStateLength === 1) {
				self.lineDialogOpen = panelState.some(function(fun) {
					return fun && (fun.name === "createLineDialog");
				});
			}
			var focusState = update.view.hasFocus;
			if((lineDialogOpen && focusState) || (panelStateLength === 0)) {
				self.editorCanBeClosed = true;
			} else {
				self.editorCanBeClosed = false;
				self.widget.wiki.deleteTiddler(self.cancelEditTiddlerStateTiddler);
			}
		})
	];

	if(this.widget.wiki.getTiddlerText("$:/config/codemirror-6/completeAnyWord") === "yes") {
		editorExtensions.push(EditorState.languageData.of(function() { return [{autocomplete: completeAnyWord}]; }));
	};

	if(autoCloseBrackets) {
		editorExtensions.push(closeBrackets());
	};

	if(this.widget.wiki.getTiddlerText("$:/config/codemirror-6/bracketMatching") === "yes") {
		editorExtensions.push(bracketMatching());
	};

	if(this.widget.wiki.getTiddlerText("$:/config/codemirror-6/lineNumbers") === "yes" && this.widget.editClass.indexOf("tc-edit-texteditor-body") !== -1) {
		editorExtensions.push(lineNumbers());
		editorExtensions.push(foldGutter());
	};

	if(this.widget.wiki.getTiddlerText("$:/config/codemirror-6/highlightActiveLine") === "yes" && this.widget.editClass.indexOf("tc-edit-texteditor-body") !== -1) {
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

	this.editorState = EditorState.create({doc: options.value,extensions: editorExtensions});
	var editorOptions = {
		parent: this.domNode,
		state: this.editorState
	};
	this.cm = new EditorView(editorOptions);

	function reconfigureCompletions(actionCompletions,tiddlerCompletions) {
		self.cm.dispatch({
			effects: actionCompletionsCompartment.reconfigure(actionCompletions)
		});
		self.cm.dispatch({
			effects: tiddlerCompletionsCompartment.reconfigure(tiddlerCompletions)
		});
	};

	this.updateTiddlerType = function() {
		var mode = this.widget.editType;
		if(mode === "") {
			mode = "text/vnd.tiddlywiki";
		}
		switch(mode) {
			case "text/vnd.tiddlywiki":
				this.cm.dispatch({
					effects: languageCompartment.reconfigure(tiddlywiki())
				});
				actionCompletions = tiddlywikiLanguage.data.of({autocomplete: this.actionCompletionSource});
				tiddlerCompletions = tiddlywikiLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
				reconfigureCompletions(actionCompletions,tiddlerCompletions);
				break;
			case "text/html":
				var {html,htmlLanguage} = CM["@codemirror/lang-html"];
				this.cm.dispatch({
					effects: languageCompartment.reconfigure(html({selfClosingTags: true}))
				});
				actionCompletions = htmlLanguage.data.of({autocomplete: this.actionCompletionSource});
				tiddlerCompletions = htmlLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
				reconfigureCompletions(actionCompletions,tiddlerCompletions);
				break;
			case "application/javascript":
				var {javascript,javascriptLanguage,scopeCompletionSource} = CM["@codemirror/lang-javascript"];
				this.cm.dispatch({
					effects: languageCompartment.reconfigure(javascript())
				});
				actionCompletions = javascriptLanguage.data.of({autocomplete: this.actionCompletionSource});
				tiddlerCompletions = javascriptLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
				reconfigureCompletions(actionCompletions,tiddlerCompletions);
				/*editorExtensions.push(
					javascriptLanguage.data.of({
						autocomplete: scopeCompletionSource(globalThis)
					})
				);*/
				break;
			case "application/json":
				var {json,jsonLanguage} = CM["@codemirror/lang-json"];
				this.cm.dispatch({
					effects: languageCompartment.reconfigure(json())
				});
				actionCompletions = jsonLanguage.data.of({autocomplete: this.actionCompletionSource});
				tiddlerCompletions = jsonLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
				reconfigureCompletions(actionCompletions,tiddlerCompletions);
				break;
			case "text/css":
				var {css,cssLanguage} = CM["@codemirror/lang-css"];
				this.cm.dispatch({
					effects: languageCompartment.reconfigure(css())
				});
				actionCompletions = cssLanguage.data.of({autocomplete: this.actionCompletionSource});
				tiddlerCompletions = cssLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
				reconfigureCompletions(actionCompletions,tiddlerCompletions);
				break;
			case "text/markdown":
			case "text/x-markdown":
				var {markdown,markdownLanguage,markdownKeymap} = CM["@codemirror/lang-markdown"];
				this.cm.dispatch({
					effects: languageCompartment.reconfigure(markdown({base: markdownLanguage}))
				});
				actionCompletions = markdownLanguage.data.of({autocomplete: this.actionCompletionSource});
				tiddlerCompletions = markdownLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
				reconfigureCompletions(actionCompletions,tiddlerCompletions);
				this.markdownKeymap = markdownKeymap;
				this.updateKeymap();
				break;
			case "text/python":
				var {python,pythonLanguage} = CM["@codemirror/lang-python"];
				this.cm.dispatch({
					effects: languageCompartment.reconfigure(python())
				});
				actionCompletions = pythonLanguage.data.of({autocomplete: this.actionCompletionSource});
				tiddlerCompletions = pythonLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
				reconfigureCompletions(actionCompletions,tiddlerCompletions);
				break;
			case "text/php":
				var {php,phpLanguage} = CM["@codemirror/lang-php"];
				this.cm.dispatch({
					effects: languageCompartment.reconfigure(php())
				});
				actionCompletions = phpLanguage.data.of({autocomplete: this.actionCompletionSource});
				tiddlerCompletions = phpLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
				reconfigureCompletions(actionCompletions,tiddlerCompletions);
				break;
			case "text/rust":
				var {rust,rustLanguage} = CM["@codemirror/lang-rust"];
				this.cm.dispatch({
					effects: languageCompartment.reconfigure(rust())
				});
				actionCompletions = rustLanguage.data.of({autocomplete: this.actionCompletionSource});
				tiddlerCompletions = rustLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
				reconfigureCompletions(actionCompletions,tiddlerCompletions);
				break;
			case "text/yaml":
				var {yaml,yamlLanguage} = CM["@codemirror/lang-yaml"];
				this.cm.dispatch({
					effects: languageCompartment.reconfigure(yaml())
				});
				actionCompletions = yamlLanguage.data.of({autocomplete: this.actionCompletionSource});
				tiddlerCompletions = yamlLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
				reconfigureCompletions(actionCompletions,tiddlerCompletions);
				break;
			case "text/go":
				var {go,goLanguage} = CM["@codemirror/lang-go"];
				this.cm.dispatch({
					effects: languageCompartment.reconfigure(go())
				});
				actionCompletions = goLanguage.data.of({autocomplete: this.actionCompletionSource});
				tiddlerCompletions = goLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
				reconfigureCompletions(actionCompletions,tiddlerCompletions);
				break;
			case "text/cpp":
				var {cpp,cppLanguage} = CM["@codemirror/lang-cpp"];
				this.cm.dispatch({
					effects: languageCompartment.reconfigure(cpp())
				});
				actionCompletions = cppLanguage.data.of({autocomplete: this.actionCompletionSource});
				tiddlerCompletions = cppLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
				reconfigureCompletions(actionCompletions,tiddlerCompletions);
				break;
			case "text/xml":
				var {xml,xmlLanguage} = CM["@codemirror/lang-xml"];
				this.cm.dispatch({
					effects: languageCompartment.reconfigure(xml())
				});
				actionCompletions = xmlLanguage.data.of({autocomplete: this.actionCompletionSource});
				tiddlerCompletions = xmlLanguage.data.of({autocomplete: this.tiddlerCompletionSource});
				reconfigureCompletions(actionCompletions,tiddlerCompletions);
				break;
			case "text/sql":
				var {sql,StandardSQL,PostgreSQL,MySQL,MariaSQL,MSSQL,SQLite,Cassandra,PLSQL} = CM["@codemirror/lang-sql"];
				var userSQLDialect;
				switch(this.widget.wiki.getTiddlerText("$:/config/codemirror-6/sqlDialect")) {
					case "StandardSQL":
						userSQLDialect = StandardSQL;
						break;
					case "PostgreSQL":
						userSQLDialect = PostgreSQL;
						break;
					case "MySQL":
						userSQLDialect = MySQL;
						break;
					case "MariaSQL":
						userSQLDialect = MariaSQL;
						break;
					case "MSSQL":
						userSQLDialect = MSSQL;
						break;
					case "SQLite":
						userSQLDialect = SQLite;
						break;
					case "Cassandra":
						userSQLDialect = Cassandra;
						break;
					case "PLSQL":
						userSQLDialect = PLSQL;
						break;
					default:
						userSQLDialect = StandardSQL;
						break;
				}
				this.cm.dispatch({
					effects: languageCompartment.reconfigure(sql({ dialect: userSQLDialect }))
				});
				actionCompletions = userSQLDialect.language.data.of({autocomplete: this.actionCompletionSource});
				tiddlerCompletions = userSQLDialect.language.data.of({autocomplete: this.tiddlerCompletionSource});
				reconfigureCompletions(actionCompletions,tiddlerCompletions);
				break;
			default:
				break;
		};
	};

	this.updateKeymap = function() {
		var updatedKeymap = keymap.of([
			...cmCloseBracketsKeymap,
			...cmDefaultKeymap,
			...cmSearchKeymap,
			...cmHistoryKeymap,
			...cmFoldKeymap,
			...cmCompletionKeymap,
			...cmLintKeymap,
			...self.markdownKeymap,
			...self.customKeymap
		]);
		this.cm.dispatch({
			effects: keymapCompartment.reconfigure(updatedKeymap)
		});
	};

	function addShortcut(shortcut) {
		this.customKeymap = [...self.customKeymap,shortcut];
	};

	function removeShortcut(command) {
		cmCloseBracketsKeymap = cmCloseBracketsKeymap.filter(function(shortcut) {
			return shortcut.run !== command;
		});
		cmDefaultKeymap = cmDefaultKeymap.filter(function(shortcut) {
			return shortcut.run !== command;
		});
		cmSearchKeymap = cmSearchKeymap.filter(function(shortcut) {
			return shortcut.run !== command;
		});
		cmHistoryKeymap = cmHistoryKeymap.filter(function(shortcut) {
			return shortcut.run !== command;
		});
		cmFoldKeymap = cmFoldKeymap.filter(function(shortcut) {
			return shortcut.run !== command;
		});
		cmCompletionKeymap = cmCompletionKeymap.filter(function(shortcut) {
			return shortcut.run !== command;
		});
		cmLintKeymap = cmLintKeymap.filter(function(shortcut) {
			return shortcut.run !== command;
		});
		this.markdownKeymap = this.markdownKeymap.filter(function(shortcut) {
			return shortcut.run !== command;
		});
		this.customKeymap = this.customKeymap.filter(function(shortcut) {
			return shortcut.run !== command;
		});
	};

	this.updateKeymaps = function() {
		var commands = this.widget.shortcutActionList;
		if(commands) {
			for(var i=0; i<commands.length; i++) {
				var command = commands[i];
				var runCommand = CM["@codemirror/search"][command] || CM["@codemirror/commands"][command];
				removeShortcut(runCommand);
				var keyInfoArray = this.widget.shortcutParsedList[i];
				if(keyInfoArray) {
					for(var k=0; k<keyInfoArray.length; k++) {
						var kbShortcutArray = this.getPrintableShortcuts(keyInfoArray);
						if(kbShortcutArray.length) {
							var kbShortcut = kbShortcutArray[k] || "";
							if(runCommand) {
								var shortcut = {
									key: kbShortcut,
									run: runCommand
								}
								addShortcut(shortcut);
							}
						}
					}
				}
			}
			this.updateKeymap();
		}
	}
};

CodeMirrorEngine.prototype.countPanelStateLength = function(array) {
	var count = 0;
	for(var i=0; i<array.length; i++) {
		if(array[i]) {
			count++;
		}
	}
	return count;
};

CodeMirrorEngine.prototype.getPrintableShortcuts = function(keyInfoArray) {
	var result = [];
	$tw.utils.each(keyInfoArray,function(keyInfo) {
		if(keyInfo) {
			var key = Object.keys($tw.keyboardManager.conversionKeys).find(function(objectKey) {
				return $tw.keyboardManager.conversionKeys[objectKey] === $tw.keyboardManager.upperCaseKey(keyInfo.key);
			});
			key = key || keyInfo.key;
			result.push((keyInfo.ctrlKey ? "ctrl-" : "") + 
					(keyInfo.shiftKey ? "shift-" : "") + 
					(keyInfo.altKey ? "alt-" : "") + 
					(keyInfo.metaKey ? self.metaKeyName : "") + 
					(key));
		}
	});
	return result;
};

CodeMirrorEngine.prototype.getTiddlerCompletionOptions = function(tiddlers,tiddlerCaptions,userCompletions,userDescriptions,prefixLength) {
	var self = this;
	var options = [];
	function applyCompletion(view,completion,from,to) {
		var applyFrom = from - prefixLength;
		var apply = completion.label;
		var applyTo = applyFrom + apply.length;
		view.dispatch(view.state.changeByRange(function(range) {
			var editorChanges = [{from:  applyFrom, to: to, insert: apply}];
			var selectionRange = self.editorSelection.range(applyTo,applyTo);
			return {
				changes: editorChanges,
				range: selectionRange
			}
		}));
	};
	for(var i=0; i<tiddlers.length; i++) {
		var tiddlerCompletion = tiddlers[i],
			tiddlerCaption = tiddlerCaptions[i];
		options.push({displayLabel: tiddlerCaption, label: tiddlerCompletion, type: "cm-tiddler", boost: 99, apply: function(view,completion,from,to) {
			applyCompletion(view,completion,from,to);
		}});
	};
	for(i=0; i<userCompletions.length; i++) {
		var userCompletion = userCompletions[i],
			userDescription = userDescriptions[i];
		options.push({displayLabel: userDescription, label: userCompletion, type: "cm-user-completion", boost: 99, apply: function(view,completion,from,to) {
			applyCompletion(view,completion,from,to);
		}});
	};
	return options;
};

CodeMirrorEngine.prototype.assignDomNodeClasses = function() {
	this.domNode.className = this.widget.getAttribute("class","");
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
	var self = this;
	if($tw.keyboardManager.handleKeydownEvent(event,{onlyPriority: true})) {
		this.dragCancel = false;
		return true;
	}
	if((event.keyCode === 27) && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && (this.completionStatus(this.cm.state) === "active")) {
		event.stopPropagation();
		return false;
	}
	if((event.keyCode === 27) && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && this.editorCanBeClosed) {
		self.widget.wiki.setText(self.cancelEditTiddlerStateTiddler,"text",null,"yes");
	} else if((event.keyCode === 27) && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && !this.editorCanBeClosed) {
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
		this.closeSearchPanel() || this.openSearchPanel();
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
