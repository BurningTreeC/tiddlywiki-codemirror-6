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

	// Import CodeMirrorDependencies
	var CodeMirrorDependencies = require("$:/plugins/BTC/tiddlywiki-codemirror-6/lib/codemirror-dependencies.js").CodeMirrorDependencies;

	// State-related dependencies
	var EditorState = CodeMirrorDependencies.state.EditorState;
	var EditorSelection = CodeMirrorDependencies.state.EditorSelection;
	var Prec = CodeMirrorDependencies.state.Prec;
	var Facet = CodeMirrorDependencies.state.Facet;
	var StateField = CodeMirrorDependencies.state.StateField;
	var StateEffect = CodeMirrorDependencies.state.StateEffect;
	var Compartment = CodeMirrorDependencies.state.Compartment;
	var allowMultipleSelections = CodeMirrorDependencies.state.allowMultipleSelections;
	var multipleSelectionsExtension = allowMultipleSelections.of(true);

	// View-related dependencies
	var EditorView = CodeMirrorDependencies.view.EditorView;
	var ViewPlugin = CodeMirrorDependencies.view.ViewPlugin;
	var dropCursor = CodeMirrorDependencies.view.dropCursor;
	var keymap = CodeMirrorDependencies.view.keymap;
	var highlightSpecialChars = CodeMirrorDependencies.view.highlightSpecialChars;
	var drawSelection = CodeMirrorDependencies.view.drawSelection;
	var highlightActiveLine = CodeMirrorDependencies.view.highlightActiveLine;
	var rectangularSelection = CodeMirrorDependencies.view.rectangularSelection;
	var crosshairCursor = CodeMirrorDependencies.view.crosshairCursor;
	var lineNumbers = CodeMirrorDependencies.view.lineNumbers;
	var highlightActiveLineGutter = CodeMirrorDependencies.view.highlightActiveLineGutter;
	var placeholder = CodeMirrorDependencies.view.placeholder;
	var tooltips = CodeMirrorDependencies.view.tooltips;
	var showPanel = CodeMirrorDependencies.view.showPanel;
	var getPanel = CodeMirrorDependencies.view.getPanel;

	// Command-related dependencies
	var defaultKeymap = CodeMirrorDependencies.commands.defaultKeymap;
	var standardKeymap = CodeMirrorDependencies.commands.standardKeymap;
	var indentWithTab = CodeMirrorDependencies.commands.indentWithTab;
	var history = CodeMirrorDependencies.commands.history;
	var historyKeymap = CodeMirrorDependencies.commands.historyKeymap;
	var undo = CodeMirrorDependencies.commands.undo;
	var redo = CodeMirrorDependencies.commands.redo;

	// Language-related dependencies
	var language = CodeMirrorDependencies.language.language;
	var indentUnit = CodeMirrorDependencies.language.indentUnit;
	var defaultHighlightStyle = CodeMirrorDependencies.language.defaultHighlightStyle;
	var syntaxHighlighting = CodeMirrorDependencies.language.syntaxHighlighting;
	var indentOnInput = CodeMirrorDependencies.language.indentOnInput;
	var bracketMatching = CodeMirrorDependencies.language.bracketMatching;
	var foldGutter = CodeMirrorDependencies.language.foldGutter;
	var foldKeymap = CodeMirrorDependencies.language.foldKeymap;
	var syntaxTree = CodeMirrorDependencies.language.syntaxTree;
	var LanguageSupport = CodeMirrorDependencies.language.LanguageSupport;
	var Language = CodeMirrorDependencies.language.Language;
	var defineLanguageFacet = CodeMirrorDependencies.language.defineLanguageFacet;
	var LRLanguage = CodeMirrorDependencies.language.LRLanguage;

	// Search-related dependencies
	var search = CodeMirrorDependencies.search.search;
	var SearchQuery = CodeMirrorDependencies.search.SearchQuery;
	var searchKeymap = CodeMirrorDependencies.search.searchKeymap;
	var highlightSelectionMatches = CodeMirrorDependencies.search.highlightSelectionMatches;
	var openSearchPanel = CodeMirrorDependencies.search.openSearchPanel;
	var closeSearchPanel = CodeMirrorDependencies.search.closeSearchPanel;
	var searchPanelOpen = CodeMirrorDependencies.search.searchPanelOpen;
	var gotoLine = CodeMirrorDependencies.search.gotoLine;

	// Autocomplete-related dependencies
	var autocompletion = CodeMirrorDependencies.autocomplete.autocompletion;
	var completionKeymap = CodeMirrorDependencies.autocomplete.completionKeymap;
	var closeBrackets = CodeMirrorDependencies.autocomplete.closeBrackets;
	var closeBracketsKeymap = CodeMirrorDependencies.autocomplete.closeBracketsKeymap;
	var completionStatus = CodeMirrorDependencies.autocomplete.completionStatus;
	var acceptCompletion = CodeMirrorDependencies.autocomplete.acceptCompletion;
	var completeAnyWord = CodeMirrorDependencies.autocomplete.completeAnyWord;

	this.EditorView = EditorView;
	this.EditorState = EditorState;
	this.Prec = Prec;
	this.keymap = keymap;
	this.autocompletion = autocompletion;
	this.syntaxTree = syntaxTree;

	var keymapCompartment = new Compartment();
	this.languageCompartment = new Compartment();
	this.autocompleteCompartment = new Compartment();
	var tabindexCompartment = new Compartment();
	var spellcheckCompartment = new Compartment();
	var autocorrectCompartment = new Compartment();
	var translateCompartment = new Compartment();
	var lineNumbersCompartment = new Compartment();
	var foldGutterCompartment = new Compartment();
	var highlightActiveLineCompartment = new Compartment();
	var highlightActiveLineGutterCompartment = new Compartment();
	var indentUnitCompartment = new Compartment();
	var bracketMatchingCompartment = new Compartment();
	var closeBracketsCompartment = new Compartment();

	this.generalUpdateListenerCompartment = new Compartment();
	this.tiddlyWikiHiglightCompartment = new Compartment();
	this.tiddlyWikiAutocompleteCompartment = new Compartment();
	this.tiddlyWikiViewPluginCompartment = new Compartment();

	// Create a general updateListener for other languages
	function createGeneralUpdateListener() {
		return EditorView.updateListener.of(function(update) {
			if(update.docChanged) {
				var text = update.state.doc.toString();
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
		});
	}

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
		cmCompletionKeymap = completionKeymap;

	this.currentKeymap = [
		...closeBracketsKeymap,
		...defaultKeymap,
		...searchKeymap,
		...historyKeymap,
		...foldKeymap,
		...completionKeymap
	];

	this.additionalKeymap = [];

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

	var paletteTiddler = this.widget.wiki.getTiddler(this.widget.wiki.getTiddlerText("$:/palette"));
	var solarizedTheme,
		solarizedHighlightStyle;

	if(paletteTiddler) {
		solarizedTheme = paletteTiddler.fields["color-scheme"] === "light" ? this.solarizedLightTheme : this.solarizedDarkTheme;
		solarizedHighlightStyle = paletteTiddler.fields["color-scheme"] === "light" ? this.solarizedLightHighlightStyle : this.solarizedDarkHighlightStyle;
	} else {
		solarizedTheme = this.solarizedLightTheme;
		solarizedHighlightStyle = this.solarizedLightHighlightStyle;
	}

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
		return null;
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
		return null;
	};

	this.customCompletionSources = [this.actionCompletionSource,this.tiddlerCompletionSource];

	this.combinedCompletionSource = function(context) {
		var options = [];
		var from;

		$tw.utils.each(self.customCompletionSources,function(source) {
			var intermediateResult = source(context);
			if(intermediateResult && intermediateResult.options.length > 0) {
				from = intermediateResult.from;
				options.push(...intermediateResult.options);
			}
		});
		if(options.length && from) {
			return {
				from: from,
				options: options
			};
		}
		var languageResults = [];
		var languageData = context.state.languageDataAt("autocomplete",context.pos);
		$tw.utils.each(languageData,function(data) {
			if(typeof data === "function") {
				var result = data(context);
				if(result && result.options && result.options.length > 0) {
					from = result.from;
					languageResults.push(...result.options);
				}
			}
		});
/*		if(languageResults.length > 0) {
			return {
				from: from,
				options: languageResults
			};
		}*/
		if(self.autocompletionSource) {
			var scopeResult = self.autocompletionSource(context);
			if(scopeResult && scopeResult.options && scopeResult.options.length > 0) {
				from = scopeResult.from;
				languageResults.push(...scopeResult.options);
			}
		}
		if(languageResults.length > 0) {
			return {
				from: from,
				options: languageResults
			};
		}
		if(self.completeAnyWord) {
			return completeAnyWord(context);
		}
		return null;
	};

	if(this.widget.wiki.getTiddlerText("$:/config/codemirror-6/indentWithTab") === "yes") {
		this.currentKeymap.push(indentWithTab);
	};

	this.autocompletionExtension = autocompletion({
		override: [self.combinedCompletionSource]
	});

	var editorExtensions = [
		self.languageCompartment.of([]),
		self.tiddlyWikiHiglightCompartment.of([]),
		self.generalUpdateListenerCompartment.of(createGeneralUpdateListener()),
		self.autocompleteCompartment.of(self.autocompletionExtension),
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
		multipleSelectionsExtension,
		indentOnInput(),
		syntaxHighlighting(defaultHighlightStyle,{fallback: true}),
		rectangularSelection(),
		crosshairCursor(),
		highlightSelectionMatches(),
		keymapCompartment.of(keymap.of(self.currentKeymap)),
		Prec.high(keymap.of({key: "Tab", run: acceptCompletion})),
		EditorView.lineWrapping,
		closeBracketsCompartment.of([]),
		bracketMatchingCompartment.of([]),
		indentUnitCompartment.of([]),
		lineNumbersCompartment.of([]),
		foldGutterCompartment.of([]),
		highlightActiveLineCompartment.of([]),
		highlightActiveLineGutterCompartment.of([]),
		tabindexCompartment.of(EditorView.contentAttributes.of({tabindex: self.widget.editTabIndex ? self.widget.editTabIndex : ""})),
		spellcheckCompartment.of([]),
		autocorrectCompartment.of([]),
		translateCompartment.of([]),
		EditorView.perLineTextDirection.of(true),
	];

	if(this.widget.editPlaceholder) {
		editorExtensions.push(placeholder(self.widget.editPlaceholder));
	};

	this.editorState = EditorState.create({doc: options.value,extensions: editorExtensions});
	var editorOptions = {
		parent: this.domNode,
		state: this.editorState
	};
	this.cm = new EditorView(editorOptions);

	this.setTWLanguageSupport = function(viewPlugin,highlightPlugin,autocompletePlugin) {
		self.cm.dispatch({
			effects: [
				//self.generalUpdateListenerCompartment.reconfigure([]),
				self.autocompleteCompartment.reconfigure([]),
				self.languageCompartment.reconfigure([]),
				self.tiddlyWikiViewPluginCompartment.reconfigure(viewPlugin),
				self.tiddlyWikiHiglightCompartment.reconfigure(highlightPlugin),
				self.tiddlyWikiAutocompleteCompartment.reconfigure(autocompletePlugin)
			]
		});
	};

this.updateKeymaps = function () {

	// 1. Standard-Keymap zusammensetzen
	var newKeymap = [
		...closeBracketsKeymap,
		...defaultKeymap,
		...searchKeymap,
		...historyKeymap,
		...foldKeymap,
		...completionKeymap
	];

	// 2. Optional: indentWithTab aktivieren?
	if (self.widget.wiki.getTiddlerText("$:/config/codemirror-6/indentWithTab") === "yes") {
		newKeymap.push(indentWithTab);
	}

	// 3. User-Shortcuts sammeln
	var commands = self.widget.shortcutActionList || [];
	var parsedList = self.widget.shortcutParsedList || [];
	for (var i = 0; i < commands.length; i++) {
		var commandName = commands[i];
		var runCommand =
			CM["@codemirror/search"][commandName] ||
			CM["@codemirror/commands"][commandName];

		if (!runCommand) {
			continue;
		}
		var keyInfoArray = parsedList[i];
		if (keyInfoArray && keyInfoArray.length > 0) {
			var kbShortcutArray = self.getPrintableShortcuts(keyInfoArray);
			for (var j = 0; j < kbShortcutArray.length; j++) {
				var kbShortcut = kbShortcutArray[j];
				if (kbShortcut) {
					newKeymap.push({ key: kbShortcut, run: runCommand });
				}
			}
		}
	}

	// 4. Weitere dynamische oder zusätzliche Keymaps einfügen (z.B. Language-Keymaps)
	if (self.additionalKeymap && Array.isArray(self.additionalKeymap)) {
		newKeymap = newKeymap.concat(self.additionalKeymap);
	}

	// 5. Speichern & ins Compartment laden
	self.currentKeymap = newKeymap;
	self.cm.dispatch({
		effects: keymapCompartment.reconfigure(keymap.of(self.currentKeymap)),
	});
};


	this.toggleSpellcheck = function(enable) {
		this.cm.dispatch({
			effects: spellcheckCompartment.reconfigure(
				EditorView.contentAttributes.of({
					spellcheck: enable
				})
			)
		});
	};

	this.toggleAutocorrect = function(enable) {
		this.cm.dispatch({
			effects: autocorrectCompartment.reconfigure(
				EditorView.contentAttributes.of({
					autocorrect: enable ? "on" : "off"
				})
			)
		});
	};

	this.toggleTranslate = function(enable) {
		this.cm.dispatch({
			effects: translateCompartment.reconfigure(
				EditorView.contentAttributes.of({
					translate: enable ? "yes" : "no"
				})
			)
		});
	};

	this.toggleLineNumbers = function(enable) {
		this.cm.dispatch({
			effects: lineNumbersCompartment.reconfigure(
				enable ? lineNumbers() : []
			)
		});
	};

	this.toggleFoldGutter = function(enable) {
		this.cm.dispatch({
			effects: foldGutterCompartment.reconfigure(
				enable ? foldGutter() : []
			)
		});
	};

	this.toggleHighlightActiveLine = function(enable) {
		this.cm.dispatch({
			effects: highlightActiveLineCompartment.reconfigure(
				enable ? highlightActiveLine() : []
			)
		});
	};

	this.toggleHighlightActiveLineGutter = function(enable) {
		this.cm.dispatch({
			effects: highlightActiveLineGutterCompartment.reconfigure(
				enable ? highlightActiveLineGutter() : []
			)
		});
	};

	this.toggleAutocompletion = function(selectOnOpen,autocompleteIcons,maxRenderedOptions) {
		this.updateAutocompletion(selectOnOpen,autocompleteIcons,maxRenderedOptions);
	};

	this.toggleCompleteAnyWord = function(enable) {
		this.completeAnyWord = enable;
	};

	this.updateIndentUnit = function() {
		var newIndentUnit = this.getIndenUnit();
		this.cm.dispatch({
			effects: indentUnitCompartment.reconfigure(indentUnit.of(newIndentUnit))
		});
	};

	this.toggleBracketMatching = function(enable) {
		this.cm.dispatch({
			effects: bracketMatchingCompartment.reconfigure(
				enable ? bracketMatching() : []
			)
		});
	};

	this.toggleCloseBrackets = function(enable) {
		this.cm.dispatch({
			effects: closeBracketsCompartment.reconfigure(
				enable ? closeBrackets() : []
			)
		});
	};

};

CodeMirrorEngine.prototype.getIndenUnit = function() {
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
	return cmIndentUnit;
};

CodeMirrorEngine.prototype.updateAutocompletion = function(selectOnOpen,autocompleteIcons,maxRenderedOptions,activateOnTyping) {
	var self = this;
	this.cm.dispatch({
		effects: self.autocompleteCompartment.reconfigure(
			self.autocompletion({
				tooltipClass: function() {
					return "cm-autocomplete-tooltip"
				},
				selectOnOpen: selectOnOpen !== undefined ? selectOnOpen : false,
				icons: autocompleteIcons !== undefined ? autocompleteIcons : true,
				maxRenderedOptions: maxRenderedOptions || 100,
				activateOnTyping: activateOnTyping !== undefined ? activateOnTyping : true,
				override: [self.combinedCompletionSource]
			})
		)
	});
};

CodeMirrorEngine.prototype.reconfigureLanguage = function (lang, language, options, keymap, source) {
	var self = this;
	var languageExtension;

	// Configure language with options and linter if provided
	if (options) {
		languageExtension = lang(options);
	} else {
		languageExtension = lang();
	}

	// Reconfigure compartments
	this.autocompletionSource = source;

	this.cm.dispatch({
		effects: self.languageCompartment.reconfigure([languageExtension])
	});

	this.cm.dispatch({
		effects: self.autocompleteCompartment.reconfigure(self.autocompletion({
			override: [self.combinedCompletionSource]
		}))
	});

	// Update additional keymaps
	this.additionalKeymap = keymap || [];

	//this.updateKeymaps();
};

CodeMirrorEngine.prototype.updateTiddlerType = function() {
	var self = this;
	var mode = this.widget.getAttribute("type","");
	if(mode === "") {
		mode = "text/vnd.tiddlywiki";
	}
	if(this.widget.hasStylesheetTag) {
		mode = "text/css";
	}
	switch(mode) {
		case "text/vnd.tiddlywiki":
		case "text/vnd.tiddlywiki-multiple":
		case "text/plain":
		case "application/x-tiddler-dictionary":
			/*var viewPlugin = require("$:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/main.js").TiddlyWikiViewPlugin;
			var highlightPlugin = require("$:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/main.js").TiddlyWikiHighlightPlugin;
			var autocompletePlugin = require("$:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/main.js").TiddlyWikiAutocompletePlugin;
			this.setTWLanguageSupport(viewPlugin,highlightPlugin,autocompletePlugin);*/
			var {tiddlywiki,TiddlyWikiLanguage} = CM["@codemirror/lang-tiddlywiki"];
			this.reconfigureLanguage(tiddlywiki,TiddlyWikiLanguage);
			break;
			break;
		case "text/html":
			var {html,htmlLanguage} = CM["@codemirror/lang-html"];
			this.reconfigureLanguage(html,htmlLanguage,{selfClosingTags: true});
			break;
		case "application/javascript":
			var {javascript,javascriptLanguage,scopeCompletionSource} = CM["@codemirror/lang-javascript"];
			this.reconfigureLanguage(javascript,javascriptLanguage,undefined,undefined,scopeCompletionSource(globalThis));
			break;
		case "application/json":
			var {json,jsonLanguage} = CM["@codemirror/lang-json"];
			this.reconfigureLanguage(json,jsonLanguage)
			break;
		case "text/css":
			var {css,cssLanguage} = CM["@codemirror/lang-css"];
			this.reconfigureLanguage(css,cssLanguage);
			break;
		case "text/markdown":
		case "text/x-markdown":
			var {markdown,markdownLanguage,markdownKeymap} = CM["@codemirror/lang-markdown"];
			this.reconfigureLanguage(markdown,markdownLanguage,{base:markdownLanguage},markdownKeymap);
			break;
		case "text/python":
			var {python,pythonLanguage,globalCompletion} = CM["@codemirror/lang-python"];
			this.reconfigureLanguage(python,pythonLanguage,undefined,undefined,globalCompletion);
			break;
		case "text/php":
			var {php,phpLanguage} = CM["@codemirror/lang-php"];
			this.reconfigureLanguage(php,phpLanguage);
			break;
		case "text/rust":
			var {rust,rustLanguage} = CM["@codemirror/lang-rust"];
			this.reconfigureLanguage(rust,rustLanguage);
			break;
		case "text/yaml":
			var {yaml,yamlLanguage} = CM["@codemirror/lang-yaml"];
			this.reconfigureLanguage(yaml,yamlLanguage);
			break;
		case "text/go":
			var {go,goLanguage} = CM["@codemirror/lang-go"];
			this.reconfigureLanguage(go,goLanguage);
			break;
		case "text/cpp":
			var {cpp,cppLanguage} = CM["@codemirror/lang-cpp"];
			this.reconfigureLanguage(cpp,cppLanguage);
			break;
		case "text/xml":
			var {xml,xmlLanguage} = CM["@codemirror/lang-xml"];
			this.reconfigureLanguage(xml,xmlLanguage);
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
			this.reconfigureLanguage(sql,undefined,{dialect:userSQLDialect});
			break;
		default:
			break;
	};
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
	return this.widget.handleKeydownEvent.call(this.widget,event) || false;
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
			newSelEnd: null,
			selection: this.cm.state.sliceDoc(selections[0].from,selections[0].to)
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
	} else if((operations.type !== "focus-editor") && operations) {
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
