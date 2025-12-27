/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/subclasses/editor/edit-text.js
type: application/javascript
module-type: widget-subclass

Widget subclass for CodeMirror 6 editor: hardened, refactored, production-ready

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.baseClass = "edit-codemirror-6";

exports.constructor = function (parseTreeNode, options) {
	this.initialise(parseTreeNode, options);
};

exports.prototype = {};

/**
 * Utilities (kept local to avoid polluting prototype)
 */
function boolConfig(wiki, title) {
	return wiki.getTiddlerText(title) === "yes";
}
function intConfig(wiki, title, fallback) {
	var v = parseInt(wiki.getTiddlerText(title), 10);
	return isFinite(v) ? v : fallback;
}
function isMainTextEditorBody(widget) {
	return !!(widget.editClass && widget.editClass.indexOf("tc-edit-texteditor-body") !== -1);
}
function hopAny(changedTiddlers, list) {
	// True if any title in list is present in changedTiddlers
	return $tw.utils.hopArray(changedTiddlers, list);
}

/**
 * Apply all config/state-driven engine settings in a single place.
 * This makes render() and refresh() consistent and prevents drift.
 */
exports.prototype.applyEngineSettings = function () {
	var wiki = this.wiki;
	var engine = this.engine;

	// Guard: engine may not exist yet in some TW lifecycle edges
	if (!engine) return;

	// Per-editor-body toggles only apply to the main text editor body
	var body = isMainTextEditorBody(this);

	// Line numbers + fold gutter
	var lineNumbers = boolConfig(wiki, "$:/config/codemirror-6/lineNumbers") && body;
	engine.toggleLineNumbers(lineNumbers);
	engine.toggleFoldGutter(lineNumbers);

	// Active line highlighting (gutter follows line highlight)
	var highlightActiveLine = boolConfig(wiki, "$:/config/codemirror-6/highlightActiveLine") && body;
	engine.toggleHighlightActiveLine(highlightActiveLine);
	engine.toggleHighlightActiveLineGutter(highlightActiveLine);

	// Spellcheck / autocorrect / translate
	engine.toggleSpellcheck(boolConfig(wiki, "$:/config/codemirror-6/spellcheck"));
	engine.toggleAutocorrect(boolConfig(wiki, "$:/config/codemirror-6/autocorrect"));

	// Translate is per-tiddler state
	var translate = boolConfig(wiki, "$:/state/codemirror-6/translate/" + this.editTitle);
	engine.toggleTranslate(translate);

	// Indentation
	engine.updateIndentUnit();

	// Brackets
	engine.toggleBracketMatching(boolConfig(wiki, "$:/config/codemirror-6/bracketMatching"));
	engine.toggleCloseBrackets(boolConfig(wiki, "$:/config/codemirror-6/closeBrackets"));

	// Autocomplete settings
	var selectOnOpen = boolConfig(wiki, "$:/config/codemirror-6/selectOnOpen");
	var autocompleteIcons = boolConfig(wiki, "$:/config/codemirror-6/autocompleteIcons");
	var maxRenderedOptions = intConfig(wiki, "$:/config/codemirror-6/maxRenderedOptions", 100);
	var activateOnTyping = boolConfig(wiki, "$:/config/codemirror-6/activateOnTyping");
	engine.toggleAutocompletion(selectOnOpen, autocompleteIcons, maxRenderedOptions, activateOnTyping);

	// Any-word completion (only once; your original set it twice)
	engine.toggleCompleteAnyWord(boolConfig(wiki, "$:/config/codemirror-6/completeAnyWord"));

	// Language/type selection
	engine.updateTiddlerType();

	// Keymaps (depends on shortcuts + indentWithTab + language keymaps)
	engine.updateKeymaps();
};

/**
 * Cache whether the edited tiddler is tagged as stylesheet.
 * Safe against missing tiddlers.
 */
exports.prototype.updateStylesheetTagCache = function () {
	var editTiddler = this.wiki.getTiddler(this.editTitle);
	this.hasStylesheetTag = !!(editTiddler && editTiddler.hasTag("$:/tags/Stylesheet"));
};

exports.prototype.render = function (parent, nextSibling) {
	// Call base class render
	Object.getPrototypeOf(Object.getPrototypeOf(this)).render.call(this, parent, nextSibling);

	// Init shortcut caches (semicolon fix + stable init)
	this.shortcutKeysList = [];       // key descriptor strings
	this.shortcutActionList = [];     // action command names (text field)
	this.shortcutParsedList = [];     // parsed key descriptors
	this.shortcutPriorityList = [];   // priority flags
	this.shortcutTiddlers = [];

	// Cache stylesheet tag status for type switching
	this.updateStylesheetTagCache();

	// Load shortcuts once initially
	this.updateShortcutLists(this.getShortcutTiddlerList());

	// Apply all settings in one place
	this.applyEngineSettings();
};

exports.prototype.execute = function () {
	Object.getPrototypeOf(Object.getPrototypeOf(this)).execute.call(this);
	this.editType = this.getAttribute("type", "");
};

exports.prototype.getShortcutTiddlerList = function () {
	return this.wiki.getTiddlersWithTag("$:/tags/KeyboardShortcut/CodeMirror");
};

/**
 * Detect changes to platform keyboard config tiddlers ($:/config/<platform>/...)
 * Returns array of matching changed tiddlers if any, else false.
 */
exports.prototype.detectNewShortcuts = function (changedTiddlers) {
	var shortcutConfigTiddlers = [];
	var handled = false;

	$tw.utils.each($tw.keyboardManager.lookupNames, function (platformDescriptor) {
		var descriptorPrefix = "$:/config/" + platformDescriptor + "/";
		Object.keys(changedTiddlers).forEach(function (t) {
			var prefix = t.substr(0, t.lastIndexOf("/") + 1);
			if (prefix === descriptorPrefix) {
				shortcutConfigTiddlers.push(t);
				handled = true;
			}
		});
	});

	return handled ? $tw.utils.hopArray(changedTiddlers, shortcutConfigTiddlers) : false;
};

exports.prototype.updateShortcutLists = function (tiddlerList) {
	this.shortcutTiddlers = tiddlerList || [];

	// Pre-size arrays for stability (optional but helps avoid stale slots)
	this.shortcutKeysList.length = this.shortcutTiddlers.length;
	this.shortcutActionList.length = this.shortcutTiddlers.length;
	this.shortcutParsedList.length = this.shortcutTiddlers.length;
	this.shortcutPriorityList.length = this.shortcutTiddlers.length;

	for (var i = 0; i < this.shortcutTiddlers.length; i++) {
		var title = this.shortcutTiddlers[i];
		var t = this.wiki.getTiddler(title);

		// Hardening: tolerate missing tiddlers
		var fields = (t && t.fields) ? t.fields : {};

		this.shortcutKeysList[i] = fields.key !== undefined ? fields.key : undefined;

		// In your original code: shortcutActionList stores "text"
		// That is assumed to be command name like "openSearchPanel" etc.
		this.shortcutActionList[i] = fields.text;

		this.shortcutParsedList[i] = this.shortcutKeysList[i] !== undefined
			? $tw.keyboardManager.parseKeyDescriptors(this.shortcutKeysList[i])
			: undefined;

		this.shortcutPriorityList[i] = fields.priority === "yes";
	}
};

/*
Handle an edit text operation message from the toolbar
*/
exports.prototype.handleEditTextOperationMessage = function (event) {
	// Prepare operation data
	var operation = this.engine.createTextOperation(event.param);

	// Run operation handler if exists
	var handler = this.editorOperations[event.param];
	if (handler) handler.call(this, event, operation);

	// Execute via engine
	var newText = this.engine.executeTextOperation(operation);

	// Fix height + save
	this.engine.fixHeight();
	this.saveChanges(newText);
};

exports.prototype.handlePasteEvent = function (event) {
	if (event.clipboardData && event.clipboardData.files && event.clipboardData.files.length) {
		event.preventDefault();
		event.stopPropagation();
		this.dispatchDOMEvent(this.cloneEvent(event, ["clipboardData"]));
		return true;
	}
	return false;
};

/**
 * Refresh: hardened and simplified.
 * - avoids mutating engine.currentKeymap directly
 * - uses applyEngineSettings() for config changes
 * - updates shortcuts when needed
 * - updates type on stylesheet tag change / type attr change / sql dialect change
 */
exports.prototype.refresh = function (changedTiddlers) {
	var changedAttributes = this.computeAttributes();
	var wiki = this.wiki;

	// Class changes: update wrapper classes
	if (changedAttributes["class"]) {
		this.engine.assignDomNodeClasses();
	}

	// Stylesheet tag change may affect type resolution
	var editTiddler = wiki.getTiddler(this.editTitle);
	if (editTiddler) {
		var newHasStylesheetTag = editTiddler.hasTag("$:/tags/Stylesheet");
		if (newHasStylesheetTag !== this.hasStylesheetTag) {
			this.hasStylesheetTag = newHasStylesheetTag;
			this.engine.updateTiddlerType();
		}
	} else if (this.hasStylesheetTag) {
		// If tiddler disappears, reset cache and re-evaluate
		this.hasStylesheetTag = false;
		this.engine.updateTiddlerType();
	}

	// If the type attribute changed or SQL dialect changed, refresh language/type
	if (changedAttributes.type || changedTiddlers["$:/config/codemirror-6/sqlDialect"]) {
		this.engine.updateTiddlerType();
	}

	// Detect changes that require re-applying engine settings
	var settingsChanged =
		changedTiddlers["$:/config/codemirror-6/spellcheck"] ||
		changedTiddlers["$:/config/codemirror-6/lineNumbers"] ||
		changedTiddlers["$:/config/codemirror-6/highlightActiveLine"] ||
		changedTiddlers["$:/config/codemirror-6/autocorrect"] ||
		changedTiddlers["$:/config/codemirror-6/activateOnTyping"] ||
		changedTiddlers["$:/config/codemirror-6/selectOnOpen"] ||
		changedTiddlers["$:/config/codemirror-6/autocompleteIcons"] ||
		changedTiddlers["$:/config/codemirror-6/maxRenderedOptions"] ||
		changedTiddlers["$:/config/codemirror-6/completeAnyWord"] ||
		changedTiddlers["$:/state/codemirror-6/translate/" + this.editTitle] ||
		changedTiddlers["$:/config/codemirror-6/indentUnit"] ||
		changedTiddlers["$:/config/codemirror-6/indentUnitMultiplier"] ||
		changedTiddlers["$:/config/codemirror-6/bracketMatching"] ||
		changedTiddlers["$:/config/codemirror-6/closeBrackets"];

	// indentWithTab affects keymaps only; don't mutate currentKeymap manually
	if (changedTiddlers["$:/config/codemirror-6/indentWithTab"]) {
		// Keymap gets rebuilt in applyEngineSettings(); mark settingsChanged true to unify path
		settingsChanged = true;
	}

	if (settingsChanged) {
		this.applyEngineSettings();
	}

	// Shortcut changes: recompute shortcut lists and refresh keymaps if needed
	var newList = this.getShortcutTiddlerList();
	var hasShortcutChanged =
		hopAny(changedTiddlers, this.shortcutTiddlers) ||
		hopAny(changedTiddlers, newList) ||
		!!this.detectNewShortcuts(changedTiddlers);

	if (hasShortcutChanged) {
		this.updateShortcutLists(newList);
		this.engine.updateKeymaps();
	}

	// Call base class refresh
	return Object.getPrototypeOf(Object.getPrototypeOf(this)).refresh.call(this, changedTiddlers);
};
