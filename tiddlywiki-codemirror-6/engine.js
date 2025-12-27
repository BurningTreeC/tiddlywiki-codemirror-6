/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/engine.js
type: application/javascript
module-type: library

Text editor engine based on a CodeMirror instance (CodeMirror 6)
Production-ready + hardened for TW widget lifecycle, reconfigure stability, keymaps, panels, and safety.
\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

// Install CodeMirror
if ($tw.browser && !window.CM) {
	require("$:/plugins/BTC/tiddlywiki-codemirror-6/lib/codemirror.js");
}

/**
 * Hardening goals implemented:
 * - No prototype methods referencing constructor locals (fixed `self` bugs)
 * - Panel + Escape behavior stable (fixes lineDialogOpen logic, prevents TW stealing Escape from CM panels)
 * - Single-dispatch reconfigure to avoid state drift
 * - Keymaps always updated after language change and after user shortcut changes
 * - Debounced saveChanges to prevent thrash and to reduce risk of slowdowns / dropped keystrokes
 * - Safe dispatch wrapper to avoid exceptions after destroy
 * - Proper destroy() to prevent leaks across widget refresh/re-render
 * - Defensive guards for missing tiddlers/config, dataTransfer, etc.
 * - Optional "draft safety": force-save on blur/unload hooks (safe, minimal)
 */

function CodeMirrorEngine(options) {
	options = options || {};
	const self = this;

	// --- Core wiring ---
	this.widget = options.widget;
	this.value = options.value || "";
	this.parentNode = options.parentNode;
	this.nextSibling = options.nextSibling;

	// Stability flags
	this._destroyed = false;
	this.dragCancel = false;
	this.lineDialogOpen = false;
	this.editorCanBeClosed = true;

	// Cancel-edit state tiddler title
	this.cancelEditTiddlerStateTiddler = this.widget.getVariable("cancelEditTiddlerStateTiddler");

	// Meta label for shortcuts
	this.metaKeyName = this.metaKeyName || "meta-";

	// --- DOM wrapper ---
	this.domNode = this.widget.document.createElement("div");
	if (this.widget.editClass) this.domNode.className = this.widget.editClass;
	this.parentNode.insertBefore(this.domNode, this.nextSibling);
	this.widget.domNodes.push(this.domNode);

	// --- Dependencies ---
	const CodeMirrorDependencies = require("$:/plugins/BTC/tiddlywiki-codemirror-6/lib/codemirror-dependencies.js").CodeMirrorDependencies;

	// State
	const {
		EditorState,
		EditorSelection,
		Prec,
		Compartment,
		allowMultipleSelections
	} = CodeMirrorDependencies.state;

	// View
	const {
		EditorView,
		dropCursor,
		keymap,
		highlightSpecialChars,
		drawSelection,
		highlightActiveLine,
		rectangularSelection,
		crosshairCursor,
		lineNumbers,
		highlightActiveLineGutter,
		placeholder,
		tooltips,
		showPanel,
		getPanel
	} = CodeMirrorDependencies.view;

	// Commands
	const {
		defaultKeymap,
		indentWithTab,
		history,
		historyKeymap,
		undo,
		redo
	} = CodeMirrorDependencies.commands;

	// Language
	const {
		indentUnit,
		defaultHighlightStyle,
		syntaxHighlighting,
		indentOnInput,
		bracketMatching,
		foldGutter,
		foldKeymap
	} = CodeMirrorDependencies.language;

	// Search
	const {
		search,
		searchKeymap,
		highlightSelectionMatches,
		openSearchPanel,
		closeSearchPanel,
		searchPanelOpen
	} = CodeMirrorDependencies.search;

	// Autocomplete
	const {
		autocompletion,
		completionKeymap,
		closeBrackets,
		closeBracketsKeymap,
		completionStatus,
		acceptCompletion,
		completeAnyWord
	} = CodeMirrorDependencies.autocomplete;

	// Expose what external code might use
	this.EditorView = EditorView;
	this.EditorState = EditorState;
	this.Prec = Prec;
	this.keymap = keymap;
	this.editorSelection = EditorSelection;
	this.completionStatus = completionStatus;
	this.undo = undo;
	this.redo = redo;
	this.showPanel = showPanel;
	this.getPanel = getPanel;
	this.searchPanelOpen = searchPanelOpen;
	this.autocompletion = autocompletion;

	// --- Compartments (all dynamic toggles) ---
	this.compartments = {
		keymap: new Compartment(),
		language: new Compartment(),
		autocomplete: new Compartment(),
		tabindex: new Compartment(),
		spellcheck: new Compartment(),
		autocorrect: new Compartment(),
		translate: new Compartment(),
		lineNumbers: new Compartment(),
		foldGutter: new Compartment(),
		highlightActiveLine: new Compartment(),
		highlightActiveLineGutter: new Compartment(),
		indentUnit: new Compartment(),
		bracketMatching: new Compartment(),
		closeBrackets: new Compartment(),

		// plugin compartments (kept for TW language support)
		generalUpdateListener: new Compartment(),
		twHighlight: new Compartment(),
		twAutocomplete: new Compartment(),
		twViewPlugin: new Compartment()
	};

	// --- Safe dispatch wrapper (prevents crashes after destroy) ---
	this.safeDispatch = function (spec) {
		if (self._destroyed || !self.cm) return;
		try {
			self.cm.dispatch(spec);
		} catch (e) {
			// Hardening: never crash TW render loop
			// Optional: log in debug mode only
			if ($tw && $tw.utils && $tw.utils.logger) {
				$tw.utils.logger("codemirror6").alert("CM dispatch error: " + (e && e.message ? e.message : e));
			} else if (console && console.warn) {
				console.warn("CM dispatch error", e);
			}
		}
	};

	// --- Debounced saveChanges (prevents thrash + reduces risk of dropped updates) ---
	this._saveTimer = null;
	this._pendingText = null;
	this._lastSavedText = this.value;

	this.scheduleSave = function (text) {
		self._pendingText = text;
		if (self._saveTimer) return;
		self._saveTimer = self.widget.setTimeout(function () {
			self._saveTimer = null;
			if (self._destroyed) return;
			const out = self._pendingText;
			self._pendingText = null;
			// Only save if changed
			if (out !== self._lastSavedText) {
				self._lastSavedText = out;
				self.widget.saveChanges(out);
			}
		}, 120); // tight enough to feel instant, slow enough to avoid thrash
	};

	this.forceSaveNow = function () {
		if (self._destroyed) return;
		const text = self.cm ? self.cm.state.doc.toString() : self._pendingText;
		if (typeof text === "string" && text !== self._lastSavedText) {
			self._lastSavedText = text;
			self.widget.saveChanges(text);
		}
	};

	// --- Theme setup ---
	this.solarizedLightTheme = EditorView.theme({}, { dark: false });
	this.solarizedDarkTheme = EditorView.theme({}, { dark: true });

	const { tags } = CM["@lezer/highlight"];
	const { HighlightStyle } = CM["@codemirror/language"];

	this.solarizedLightHighlightStyle = $tw.utils.codemirror.getSolarizedLightHighlightStyle(HighlightStyle, tags);
	this.solarizedDarkHighlightStyle = $tw.utils.codemirror.getSolarizedDarkHighlightStyle(HighlightStyle, tags);

	const paletteTitle = this.widget.wiki.getTiddlerText("$:/palette");
	const paletteTiddler = paletteTitle ? this.widget.wiki.getTiddler(paletteTitle) : this.widget.wiki.getTiddler("$:/palette");

	let solarizedTheme = this.solarizedLightTheme;
	let solarizedHighlightStyle = this.solarizedLightHighlightStyle;
	if (paletteTiddler && paletteTiddler.fields && paletteTiddler.fields["color-scheme"] === "dark") {
		solarizedTheme = this.solarizedDarkTheme;
		solarizedHighlightStyle = this.solarizedDarkHighlightStyle;
	}

	// --- Keymaps ---
	this.additionalKeymap = [];
	this.currentKeymap = [];

	// Keep references to base keymaps (stable)
	this._baseKeymaps = {
		closeBracketsKeymap: closeBracketsKeymap,
		defaultKeymap: defaultKeymap,
		searchKeymap: searchKeymap,
		historyKeymap: historyKeymap,
		foldKeymap: foldKeymap,
		completionKeymap: completionKeymap,
		indentWithTab: indentWithTab
	};

	// --- Search panel wrappers ---
	this.openSearchPanel = function () { return openSearchPanel(self.cm); };
	this.closeSearchPanel = function () { return closeSearchPanel(self.cm); };

	// --- Completion sources ---
	this.customCompletionSources = [];
	this.autocompletionSource = null;
	this.completeAnyWord = false;

	this.actionCompletionSource = function (context) {
		const actionTiddlers = self.widget.wiki.filterTiddlers("[all[tiddlers+shadows]tag[$:/tags/CodeMirror/Action]!is[draft]]");
		const actionStrings = [];
		const actions = [];
		$tw.utils.each(actionTiddlers, function (title) {
			const t = self.widget.wiki.getTiddler(title);
			if (t && t.fields) {
				actionStrings.push(t.fields.string);
				actions.push(t.fields.text);
			}
		});
		$tw.utils.each(actionStrings, function (actionString) {
			if (!actionString) return;
			const escaped = actionString.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const regex = $tw.utils.codemirror.validateRegex(escaped) ? new RegExp(escaped) : null;
			if (!regex) return;
			const m = context.matchBefore(regex);
			if (!m) return;

			const str = m.text;
			const idx = actionStrings.indexOf(str);
			if (idx === -1) return;

			self.safeDispatch({ changes: { from: m.from, to: m.to, insert: "" } });
			self.widget.invokeActionString(actions[idx], self, undefined, self.widget.variables);
		});
		return null;
	};

	this.tiddlerCompletionSource = function (context) {
		const delimiter = self.widget.wiki.getTiddlerText("$:/config/codemirror-6/tiddlerMatchDelimiter");
		if (!delimiter) return null;

		const escaped = delimiter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const delimiterRegex = $tw.utils.codemirror.validateRegex(escaped) ? new RegExp(escaped) : null;
		if (!delimiterRegex) return null;

		// non-whitespace tail
		const completeRegex = new RegExp(delimiterRegex.source + "[^\\s]*");
		const completeMatch = context.matchBefore(completeRegex);
		if (!completeMatch) return null;

		const tiddlers = self.widget.wiki.filterTiddlers(self.widget.wiki.getTiddlerText("$:/config/codemirror-6/tiddlerFilter"));
		const tiddlerCaptions = [];
		$tw.utils.each(tiddlers, function (title) {
			const tid = self.widget.wiki.getTiddler(title);
			const cap = (tid && tid.fields && tid.fields.caption) ? tid.fields.caption : title;
			tiddlerCaptions.push(cap);
		});

		const userTiddlers = self.widget.wiki.filterTiddlers("[all[tiddlers+shadows]tag[$:/tags/CodeMirror/AutoComplete]!is[draft]]");
		const userSnippets = self.widget.wiki.filterTiddlers("[all[tiddlers+shadows]tag[$:/tags/CodeMirror/Snippet]!is[draft]]");
		const userCompletions = [];
		const userDescriptions = [];

		function addUserCompletion(title) {
			const t = self.widget.wiki.getTiddler(title);
			if (!t || !t.fields) return;
			const txt = t.fields.text;
			if (!txt) return;
			userCompletions.push(txt);
			userDescriptions.push(t.fields.description || txt);
		}
		$tw.utils.each(userTiddlers, addUserCompletion);
		$tw.utils.each(userSnippets, addUserCompletion);

		return {
			from: completeMatch.from + delimiter.length,
			options: self.getTiddlerCompletionOptions(
				tiddlers,
				tiddlerCaptions,
				userCompletions,
				userDescriptions,
				/*prefixLength*/ delimiter.length
			)
		};
	};

	this.customCompletionSources = [this.actionCompletionSource, this.tiddlerCompletionSource];

	this.combinedCompletionSource = function (context) {
		let options = [];
		let from = null;

		// Custom completions first
		$tw.utils.each(self.customCompletionSources, function (source) {
			const r = source(context);
			if (r && r.options && r.options.length > 0) {
				from = r.from;
				options = options.concat(r.options);
			}
		});
		if (options.length && from !== null) return { from: from, options: options };

		// Language provided completions
		let languageOptions = [];
		const languageData = context.state.languageDataAt("autocomplete", context.pos);
		$tw.utils.each(languageData, function (data) {
			if (typeof data !== "function") return;
			const r = data(context);
			if (r && r.options && r.options.length > 0) {
				from = r.from;
				languageOptions = languageOptions.concat(r.options);
			}
		});

		// Optional external source (e.g. JS scopeCompletionSource)
		if (self.autocompletionSource) {
			const r = self.autocompletionSource(context);
			if (r && r.options && r.options.length > 0) {
				from = r.from;
				languageOptions = languageOptions.concat(r.options);
			}
		}

		if (languageOptions.length && from !== null) return { from: from, options: languageOptions };

		// Fallback word completion if enabled
		if (self.completeAnyWord) return completeAnyWord(context);
		return null;
	};

	// --- Autocompletion extension (dynamic) ---
	this.autocompletionExtension = autocompletion({
		override: [self.combinedCompletionSource]
	});

	// --- Update listener: stable panel/Escape behavior + debounced save ---
	function createGeneralUpdateListener() {
		return EditorView.updateListener.of(function (update) {
			if (self._destroyed) return;

			if (update.docChanged) {
				self.scheduleSave(update.state.doc.toString());
			}

			// Panel state: robust
			const panels = update.view.state.facet(showPanel) || [];
			const panelCount = self.countPanelStateLength(panels);

			// Track line dialog open
			if (panelCount === 1) {
				self.lineDialogOpen = panels.some(function (fun) {
					return fun && fun.name === "createLineDialog";
				});
			} else if (panelCount === 0) {
				self.lineDialogOpen = false;
			}

			const focusState = update.view.hasFocus;
			const lineDialogOpen = self.lineDialogOpen === true;

			// If no panels OR only line dialog while focused => editor can be closed by Escape
			if ((lineDialogOpen && focusState) || panelCount === 0) {
				self.editorCanBeClosed = true;
			} else {
				self.editorCanBeClosed = false;
				// Keep state consistent: remove cancel marker while in panels
				self.widget.wiki.deleteTiddler(self.cancelEditTiddlerStateTiddler);
			}
		});
	}

	// --- Baseline extensions ---
	const multipleSelectionsExtension = allowMultipleSelections.of(true);

	// Config-derived defaults
	const autoCloseBrackets = this.widget.wiki.getTiddlerText("$:/config/codemirror-6/closeBrackets") === "yes";
	const bracketMatchDefault = this.widget.wiki.getTiddlerText("$:/config/codemirror-6/bracketMatching") === "yes";
	const lineNumbersDefault = this.widget.wiki.getTiddlerText("$:/config/codemirror-6/lineNumbers") === "yes";
	const foldGutterDefault = this.widget.wiki.getTiddlerText("$:/config/codemirror-6/foldGutter") === "yes";
	const highlightLineDefault = this.widget.wiki.getTiddlerText("$:/config/codemirror-6/highlightActiveLine") === "yes";
	const highlightGutterDefault = this.widget.wiki.getTiddlerText("$:/config/codemirror-6/highlightActiveLineGutter") === "yes";

	const editorExtensions = [
		// Dynamic compartments
		self.compartments.language.of([]),
		self.compartments.twHighlight.of([]),
		self.compartments.twAutocomplete.of([]),
		self.compartments.twViewPlugin.of([]),
		self.compartments.generalUpdateListener.of(createGeneralUpdateListener()),
		self.compartments.autocomplete.of(self.autocompletionExtension),

		// Core UX
		dropCursor(),
		solarizedTheme,
		Prec.high(syntaxHighlighting(solarizedHighlightStyle)),
		tooltips({}),
		search(),
		highlightSpecialChars(),
		history(),
		drawSelection(),
		multipleSelectionsExtension,
		indentOnInput(),
		syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
		rectangularSelection(),
		crosshairCursor(),
		highlightSelectionMatches(),

		// Event handling (hardened)
		Prec.high(EditorView.domEventHandlers({
			drop(event, view) {
				self.dragCancel = false;
				return self.handleDropEvent(event, view);
			},
			dragstart() { self.dragCancel = true; return false; },
			dragenter(event) {
				self.dragCancel = true;
				if (self.widget.isFileDropEnabled &&
					($tw.utils.dragEventContainsFiles(event) ||
						(event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length))) {
					event.preventDefault();
					return true;
				}
				return false;
			},
			dragover(event) {
				self.dragCancel = true;
				if (self.widget.isFileDropEnabled &&
					($tw.utils.dragEventContainsFiles(event) ||
						(event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length))) {
					event.preventDefault();
					event.stopPropagation();
					return true;
				}
				return false;
			},
			dragleave(event) {
				self.dragCancel = false;
				if (self.widget.isFileDropEnabled) {
					event.preventDefault();
					return true;
				}
				return false;
			},
			dragend() { self.dragCancel = true; return false; },
			paste(event) {
				event.twEditor = true;
				if (self.widget.isFileDropEnabled) {
					return self.widget.handlePasteEvent.call(self.widget, event);
				}
				return false;
			},
			keydown(event, view) {
				return self.handleKeydownEvent(event, view);
			},
			focus() {
				if (self.widget.editCancelPopups) $tw.popup.cancel(0);
				return false;
			},
			blur() {
				// Draft safety: force-save on blur (cheap, safe)
				self.forceSaveNow();
				return false;
			}
		})),

		// Keymaps dynamic
		self.compartments.keymap.of(keymap.of([])),
		Prec.high(keymap.of({ key: "Tab", run: acceptCompletion })),

		EditorView.lineWrapping,

		// Toggles dynamic (defaults from config)
		self.compartments.closeBrackets.of(autoCloseBrackets ? closeBrackets() : []),
		self.compartments.bracketMatching.of(bracketMatchDefault ? bracketMatching() : []),
		self.compartments.indentUnit.of(indentUnit.of(self.getIndenUnit())),
		self.compartments.lineNumbers.of(lineNumbersDefault ? lineNumbers() : []),
		self.compartments.foldGutter.of(foldGutterDefault ? foldGutter() : []),
		self.compartments.highlightActiveLine.of(highlightLineDefault ? highlightActiveLine() : []),
		self.compartments.highlightActiveLineGutter.of(highlightGutterDefault ? highlightActiveLineGutter() : []),

		self.compartments.tabindex.of(
			EditorView.contentAttributes.of({ tabindex: self.widget.editTabIndex ? self.widget.editTabIndex : "" })
		),
		self.compartments.spellcheck.of([]),
		self.compartments.autocorrect.of([]),
		self.compartments.translate.of([]),

		EditorView.perLineTextDirection.of(true)
	];

	if (this.widget.editPlaceholder) editorExtensions.push(placeholder(this.widget.editPlaceholder));

	// Create state + view
	this.editorState = EditorState.create({ doc: this.value, extensions: editorExtensions });
	this.cm = new EditorView({ parent: this.domNode, state: this.editorState });

	// --- Optional: harden against accidental page unload (best-effort) ---
	// Not all TW contexts allow this, but it’s safe to register and safe to remove on destroy.
	this._beforeUnloadHandler = function () {
		try { self.forceSaveNow(); } catch (e) {}
	};
	if (this.widget && this.widget.document && this.widget.document.defaultView) {
		try {
			this.widget.document.defaultView.addEventListener("beforeunload", this._beforeUnloadHandler, { passive: true });
		} catch (e) {}
	}

	// --- Keymap builder (feature-complete + stable) ---
	this.updateKeymaps = function updateKeymaps() {
		let km = []
			.concat(self._baseKeymaps.closeBracketsKeymap)
			.concat(self._baseKeymaps.defaultKeymap)
			.concat(self._baseKeymaps.searchKeymap)
			.concat(self._baseKeymaps.historyKeymap)
			.concat(self._baseKeymaps.foldKeymap)
			.concat(self._baseKeymaps.completionKeymap);

		if (self.widget.wiki.getTiddlerText("$:/config/codemirror-6/indentWithTab") === "yes") {
			km.push(self._baseKeymaps.indentWithTab);
		}

		// User shortcuts
		const commands = self.widget.shortcutActionList || [];
		const parsedList = self.widget.shortcutParsedList || [];
		for (let i = 0; i < commands.length; i++) {
			const commandName = commands[i];
			const runCommand =
				(CM["@codemirror/search"] && CM["@codemirror/search"][commandName]) ||
				(CM["@codemirror/commands"] && CM["@codemirror/commands"][commandName]);

			if (!runCommand) continue;
			const keyInfoArray = parsedList[i];
			if (!keyInfoArray || keyInfoArray.length === 0) continue;

			const shortcuts = self.getPrintableShortcuts(keyInfoArray);
			for (let j = 0; j < shortcuts.length; j++) {
				const s = shortcuts[j];
				if (s) km.push({ key: s, run: runCommand });
			}
		}

		// Add language-specific keymaps
		if (Array.isArray(self.additionalKeymap) && self.additionalKeymap.length) {
			km = km.concat(self.additionalKeymap);
		}

		self.currentKeymap = km;
		self.safeDispatch({
			effects: self.compartments.keymap.reconfigure(self.keymap.of(self.currentKeymap))
		});
	};

	// Init keymaps
	this.updateKeymaps();

	// --- TW language support hook (kept) ---
	this.setTWLanguageSupport = function (viewPlugin, highlightPlugin, autocompletePlugin) {
		self.safeDispatch({
			effects: [
				self.compartments.autocomplete.reconfigure([]),
				self.compartments.language.reconfigure([]),
				self.compartments.twViewPlugin.reconfigure(viewPlugin),
				self.compartments.twHighlight.reconfigure(highlightPlugin),
				self.compartments.twAutocomplete.reconfigure(autocompletePlugin)
			]
		});
	};

	// --- Reconfigure by type immediately (feature completeness) ---
	// Your original engine expects updateTiddlerType() to be called by widget logic,
	// but doing it here makes engine behavior self-contained and stable.
	this.updateTiddlerType();

	// --- Public toggle wrappers (stable) ---
	this.toggleSpellcheck = function (enable) {
		self.safeDispatch({
			effects: self.compartments.spellcheck.reconfigure(
				EditorView.contentAttributes.of({ spellcheck: enable ? "true" : "false" })
			)
		});
	};

	this.toggleAutocorrect = function (enable) {
		self.safeDispatch({
			effects: self.compartments.autocorrect.reconfigure(
				EditorView.contentAttributes.of({ autocorrect: enable ? "on" : "off" })
			)
		});
	};

	this.toggleTranslate = function (enable) {
		self.safeDispatch({
			effects: self.compartments.translate.reconfigure(
				EditorView.contentAttributes.of({ translate: enable ? "yes" : "no" })
			)
		});
	};

	this.toggleLineNumbers = function (enable) {
		self.safeDispatch({
			effects: self.compartments.lineNumbers.reconfigure(enable ? lineNumbers() : [])
		});
	};

	this.toggleFoldGutter = function (enable) {
		self.safeDispatch({
			effects: self.compartments.foldGutter.reconfigure(enable ? foldGutter() : [])
		});
	};

	this.toggleHighlightActiveLine = function (enable) {
		self.safeDispatch({
			effects: self.compartments.highlightActiveLine.reconfigure(enable ? highlightActiveLine() : [])
		});
	};

	this.toggleHighlightActiveLineGutter = function (enable) {
		self.safeDispatch({
			effects: self.compartments.highlightActiveLineGutter.reconfigure(enable ? highlightActiveLineGutter() : [])
		});
	};

	this.toggleCompleteAnyWord = function (enable) {
		self.completeAnyWord = !!enable;
		// Ensure autocomplete uses new behavior
		self.updateAutocompletion(undefined, undefined, undefined, undefined);
	};

	this.toggleBracketMatching = function (enable) {
		self.safeDispatch({
			effects: self.compartments.bracketMatching.reconfigure(enable ? bracketMatching() : [])
		});
	};

	this.toggleCloseBrackets = function (enable) {
		self.safeDispatch({
			effects: self.compartments.closeBrackets.reconfigure(enable ? closeBrackets() : [])
		});
	};

	this.updateIndentUnit = function () {
		self.safeDispatch({
			effects: self.compartments.indentUnit.reconfigure(indentUnit.of(self.getIndenUnit()))
		});
	};

	this.toggleAutocompletion = function (selectOnOpen, autocompleteIcons, maxRenderedOptions, activateOnTyping) {
		self.updateAutocompletion(selectOnOpen, autocompleteIcons, maxRenderedOptions, activateOnTyping);
	};

	// --- Hardening: explicit destroy for TW widget lifecycle ---
	// Call this from widget's refresh/destroy path to prevent memory leaks.
	this.destroy = function () {
		if (self._destroyed) return;
		self._destroyed = true;

		try { self.forceSaveNow(); } catch (e) {}

		// Clear debounce timer
		if (self._saveTimer) {
			try { self.widget.clearTimeout(self._saveTimer); } catch (e) {}
			self._saveTimer = null;
		}

		// Remove unload handler
		try {
			if (self.widget && self.widget.document && self.widget.document.defaultView && self._beforeUnloadHandler) {
				self.widget.document.defaultView.removeEventListener("beforeunload", self._beforeUnloadHandler, { passive: true });
			}
		} catch (e) {}

		// Destroy CM view
		try {
			if (self.cm) self.cm.destroy();
		} catch (e) {}

		// Remove DOM node
		try {
			if (self.domNode && self.domNode.parentNode) self.domNode.parentNode.removeChild(self.domNode);
		} catch (e) {}

		self.cm = null;
		self.domNode = null;
	};
}

// ---------------- Prototype methods ----------------

CodeMirrorEngine.prototype.getIndenUnit = function () {
	let cmIndentUnitValue;
	const indentUnitValue = this.widget.wiki.getTiddlerText("$:/config/codemirror-6/indentUnit");
	switch (indentUnitValue) {
		case "spaces": cmIndentUnitValue = " "; break;
		case "tabs": cmIndentUnitValue = "\t"; break;
		default: cmIndentUnitValue = "\t"; break;
	}

	const mult = parseInt(this.widget.wiki.getTiddlerText("$:/config/codemirror-6/indentUnitMultiplier"), 10);
	const indentUnitMultiplier = isFinite(mult) && mult > 0 ? mult : 1;

	let out = "";
	for (let i = 0; i < indentUnitMultiplier; i++) out += cmIndentUnitValue;
	return out;
};

CodeMirrorEngine.prototype.updateAutocompletion = function (selectOnOpen, autocompleteIcons, maxRenderedOptions, activateOnTyping) {
	const self = this;
	self.safeDispatch({
		effects: self.compartments.autocomplete.reconfigure(
			self.autocompletion({
				tooltipClass: function () { return "cm-autocomplete-tooltip"; },
				selectOnOpen: selectOnOpen !== undefined ? !!selectOnOpen : false,
				icons: autocompleteIcons !== undefined ? !!autocompleteIcons : true,
				maxRenderedOptions: maxRenderedOptions || 100,
				activateOnTyping: activateOnTyping !== undefined ? !!activateOnTyping : true,
				override: [self.combinedCompletionSource]
			})
		)
	});
};

CodeMirrorEngine.prototype.reconfigureLanguage = function (lang, /*language*/ _language, options, keymap, source) {
	const self = this;

	const languageExtension = options ? lang(options) : lang();

	self.autocompletionSource = source || null;
	self.additionalKeymap = keymap || [];

	// Single dispatch: avoid state drift
	self.safeDispatch({
		effects: [
			self.compartments.language.reconfigure([languageExtension]),
			self.compartments.autocomplete.reconfigure(self.autocompletion({
				override: [self.combinedCompletionSource]
			}))
		]
	});

	// Make sure keymaps reflect language changes
	self.updateKeymaps();
};

CodeMirrorEngine.prototype.updateTiddlerType = function () {
	let mode = this.widget.getAttribute("type", "") || "text/vnd.tiddlywiki";
	if (this.widget.hasStylesheetTag) mode = "text/css";

	switch (mode) {
		case "text/vnd.tiddlywiki":
		case "text/vnd.tiddlywiki-multiple":
		case "text/plain":
		case "application/x-tiddler-dictionary": {
			const { tiddlywiki, TiddlyWikiLanguage } = CM["@codemirror/lang-tiddlywiki"];
			this.reconfigureLanguage(tiddlywiki, TiddlyWikiLanguage);
			break;
		}
		case "text/html": {
			const { html, htmlLanguage } = CM["@codemirror/lang-html"];
			this.reconfigureLanguage(html, htmlLanguage, { selfClosingTags: true });
			break;
		}
		case "application/javascript": {
			const { javascript, javascriptLanguage, scopeCompletionSource } = CM["@codemirror/lang-javascript"];
			this.reconfigureLanguage(javascript, javascriptLanguage, undefined, undefined, scopeCompletionSource(globalThis));
			break;
		}
		case "application/json": {
			const { json, jsonLanguage } = CM["@codemirror/lang-json"];
			this.reconfigureLanguage(json, jsonLanguage);
			break;
		}
		case "text/css": {
			const { css, cssLanguage } = CM["@codemirror/lang-css"];
			this.reconfigureLanguage(css, cssLanguage);
			break;
		}
		case "text/markdown":
		case "text/x-markdown": {
			const { markdown, markdownLanguage, markdownKeymap } = CM["@codemirror/lang-markdown"];
			this.reconfigureLanguage(markdown, markdownLanguage, { base: markdownLanguage }, markdownKeymap);
			break;
		}
		case "text/python": {
			const { python, pythonLanguage, globalCompletion } = CM["@codemirror/lang-python"];
			this.reconfigureLanguage(python, pythonLanguage, undefined, undefined, globalCompletion);
			break;
		}
		case "text/php": {
			const { php, phpLanguage } = CM["@codemirror/lang-php"];
			this.reconfigureLanguage(php, phpLanguage);
			break;
		}
		case "text/rust": {
			const { rust, rustLanguage } = CM["@codemirror/lang-rust"];
			this.reconfigureLanguage(rust, rustLanguage);
			break;
		}
		case "text/yaml": {
			const { yaml, yamlLanguage } = CM["@codemirror/lang-yaml"];
			this.reconfigureLanguage(yaml, yamlLanguage);
			break;
		}
		case "text/go": {
			const { go, goLanguage } = CM["@codemirror/lang-go"];
			this.reconfigureLanguage(go, goLanguage);
			break;
		}
		case "text/cpp": {
			const { cpp, cppLanguage } = CM["@codemirror/lang-cpp"];
			this.reconfigureLanguage(cpp, cppLanguage);
			break;
		}
		case "text/xml": {
			const { xml, xmlLanguage } = CM["@codemirror/lang-xml"];
			this.reconfigureLanguage(xml, xmlLanguage);
			break;
		}
		case "text/sql": {
			const { sql, StandardSQL, PostgreSQL, MySQL, MariaSQL, MSSQL, SQLite, Cassandra, PLSQL } = CM["@codemirror/lang-sql"];
			let userSQLDialect = StandardSQL;

			switch (this.widget.wiki.getTiddlerText("$:/config/codemirror-6/sqlDialect")) {
				case "PostgreSQL": userSQLDialect = PostgreSQL; break;
				case "MySQL": userSQLDialect = MySQL; break;
				case "MariaSQL": userSQLDialect = MariaSQL; break;
				case "MSSQL": userSQLDialect = MSSQL; break;
				case "SQLite": userSQLDialect = SQLite; break;
				case "Cassandra": userSQLDialect = Cassandra; break;
				case "PLSQL": userSQLDialect = PLSQL; break;
				case "StandardSQL":
				default: userSQLDialect = StandardSQL; break;
			}
			this.reconfigureLanguage(sql, undefined, { dialect: userSQLDialect });
			break;
		}
		default:
			break;
	}
};

CodeMirrorEngine.prototype.countPanelStateLength = function (array) {
	let count = 0;
	for (let i = 0; i < array.length; i++) if (array[i]) count++;
	return count;
};

CodeMirrorEngine.prototype.getPrintableShortcuts = function (keyInfoArray) {
	const self = this;
	const result = [];
	$tw.utils.each(keyInfoArray, function (keyInfo) {
		if (!keyInfo) return;

		let key = Object.keys($tw.keyboardManager.conversionKeys).find(function (objectKey) {
			return $tw.keyboardManager.conversionKeys[objectKey] === $tw.keyboardManager.upperCaseKey(keyInfo.key);
		});
		key = key || keyInfo.key;

		result.push(
			(keyInfo.ctrlKey ? "ctrl-" : "") +
			(keyInfo.shiftKey ? "shift-" : "") +
			(keyInfo.altKey ? "alt-" : "") +
			(keyInfo.metaKey ? (self.metaKeyName || "meta-") : "") +
			(key)
		);
	});
	return result;
};

CodeMirrorEngine.prototype.getTiddlerCompletionOptions = function (tiddlers, tiddlerCaptions, userCompletions, userDescriptions, prefixLength) {
	const self = this;
	const options = [];

	function applyCompletion(view, completion, from, to) {
		const applyFrom = from - prefixLength;
		const insert = completion.label;
		const applyTo = applyFrom + insert.length;

		view.dispatch(view.state.changeByRange(function () {
			return {
				changes: [{ from: applyFrom, to: to, insert: insert }],
				range: self.editorSelection.range(applyTo, applyTo)
			};
		}));
	}

	for (let i = 0; i < tiddlers.length; i++) {
		options.push({
			displayLabel: tiddlerCaptions[i],
			label: tiddlers[i],
			type: "cm-tiddler",
			boost: 99,
			apply: applyCompletion
		});
	}

	for (let j = 0; j < userCompletions.length; j++) {
		options.push({
			displayLabel: userDescriptions[j],
			label: userCompletions[j],
			type: "cm-user-completion",
			boost: 99,
			apply: applyCompletion
		});
	}

	return options;
};

CodeMirrorEngine.prototype.assignDomNodeClasses = function () {
	this.domNode.className = this.widget.getAttribute("class", "");
};

CodeMirrorEngine.prototype.handleDropEvent = function (event, view) {
	if (!this.widget.isFileDropEnabled) {
		event.stopPropagation();
		return false;
	}
	if ($tw.utils.dragEventContainsFiles(event) || (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length)) {
		const pos = view.posAtCoords({ x: event.clientX, y: event.clientY }, true);
		view.dispatch({ selection: { anchor: pos, head: pos } });
		event.preventDefault();
		return true;
	}
	return false;
};

CodeMirrorEngine.prototype.handleKeydownEvent = function (event, view) {
	const self = this;

	// Priority TW keyboard handling
	if ($tw.keyboardManager.handleKeydownEvent(event, { onlyPriority: true })) {
		this.dragCancel = false;
		return true;
	}

	// Escape while completion active => do not let TW steal it
	if ((event.keyCode === 27) && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey &&
		(this.completionStatus(this.cm.state) === "active")) {
		event.stopPropagation();
		return false;
	}

	// Escape close behavior guarded by panel state
	if ((event.keyCode === 27) && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
		if (this.editorCanBeClosed) {
			self.widget.wiki.setText(self.cancelEditTiddlerStateTiddler, "text", null, "yes");
		} else {
			event.stopPropagation();
			return false;
		}
	}

	// Respect nested <keyboard> widgets
	let widget = this.widget;
	const keyboardWidgets = [];
	while (widget) {
		if (widget.parseTreeNode && widget.parseTreeNode.type === "keyboard") keyboardWidgets.push(widget);
		widget = widget.parentWidget;
	}

	if (keyboardWidgets.length > 0) {
		let handled;
		for (let i = 0; i < keyboardWidgets.length; i++) {
			const keyboardWidget = keyboardWidgets[i];
			const keyInfoArray = keyboardWidget.keyInfoArray;
			if ($tw.keyboardManager.checkKeyDescriptors(event, keyInfoArray)) {
				if (this.dragCancel && ($tw.keyboardManager.getPrintableShortcuts(keyInfoArray).indexOf("Escape") !== -1)) {
					handled = false;
				} else {
					handled = true;
				}
			}
		}
		if (handled) {
			this.dragCancel = false;
			return true;
		} else if (handled === false) {
			event.stopPropagation();
			this.dragCancel = false;
			return true;
		}
	}

	this.dragCancel = false;
	return this.widget.handleKeydownEvent.call(this.widget, event) || false;
};

// Set the text of the engine if it doesn't currently have focus
CodeMirrorEngine.prototype.setText = function (text /*, type */) {
	if (!this.cm.hasFocus) this.updateDomNodeText(text);
};

CodeMirrorEngine.prototype.updateDomNodeText = function (text) {
	const selections = this.cm.state.selection;
	this.safeDispatch(this.cm.state.update({
		changes: { from: 0, to: this.cm.state.doc.length, insert: text },
		selection: selections,
		docChanged: true
	}));
};

CodeMirrorEngine.prototype.getText = function () {
	return this.cm.state.doc.toString();
};

CodeMirrorEngine.prototype.fixHeight = function () {
	this.cm.requestMeasure();
};

CodeMirrorEngine.prototype.focus = function () {
	this.cm.focus();
};

CodeMirrorEngine.prototype.createTextOperation = function (type) {
	const selections = this.cm.state.selection.ranges;
	let operations;

	switch (type) {
		case "excise":
		case "focus-editor":
		case "insert-text":
		case "make-link":
		case "prefix-lines":
		case "redo":
		case "replace-all":
		case "replace-selection":
		case "save-selection":
		case "search":
		case "undo":
		case "wrap-lines":
		case "wrap-selection":
			operations = [];
			for (let i = 0; i < selections.length; i++) {
				const anchorPos = selections[i].from;
				const headPos = selections[i].to;
				const op = {
					text: this.cm.state.doc.toString(),
					selStart: anchorPos,
					selEnd: headPos,
					cutStart: null,
					cutEnd: null,
					replacement: null,
					newSelStart: null,
					newSelEnd: null
				};
				op.selection = this.cm.state.sliceDoc(anchorPos, headPos);
				operations.push(op);
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
				selection: this.cm.state.sliceDoc(selections[0].from, selections[0].to)
			};
			break;
	}
	return operations;
};

CodeMirrorEngine.prototype.executeTextOperation = function (operations) {
	const self = this;

	if (operations && operations.type === "undo") {
		this.undo(this.cm);
	} else if (operations && operations.type === "redo") {
		this.redo(this.cm);
	} else if (operations && operations.type === "search") {
		this.closeSearchPanel() || this.openSearchPanel();
	} else if (operations && operations.type !== "focus-editor" && Array.isArray(operations) && operations.length) {
		const ranges = this.cm.state.selection.ranges;
		this.safeDispatch(this.cm.state.changeByRange(function (range) {
			let index = 0;
			for (let i = 0; i < ranges.length; i++) {
				if (ranges[i] === range) { index = i; break; }
			}
			return {
				changes: [{ from: operations[index].cutStart, to: operations[index].cutEnd, insert: operations[index].replacement }],
				range: self.editorSelection.range(operations[index].newSelStart, operations[index].newSelEnd)
			};
		}));
	} else if (operations && operations.type !== "focus-editor") {
		this.safeDispatch(this.cm.state.changeByRange(function () {
			return {
				changes: [{ from: operations.cutStart, to: operations.cutEnd, insert: operations.replacement }],
				range: self.editorSelection.range(operations.newSelStart, operations.newSelEnd)
			};
		}));
	}

	this.cm.focus();
	return this.cm.state.doc.toString();
};

// Export
exports.CodeMirrorEngine = $tw.browser ? CodeMirrorEngine : require("$:/core/modules/editor/engines/simple.js").SimpleEngine;

