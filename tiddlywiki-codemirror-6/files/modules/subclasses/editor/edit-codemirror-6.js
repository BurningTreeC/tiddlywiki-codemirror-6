/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/subclasses/editor/edit-text.js
type: application/javascript
module-type: widget-subclass

Widget base class

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.baseClass = "edit-codemirror-6";

exports.constructor = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};

exports.prototype = {};

exports.prototype.render = function(parent,nextSibling) {
	// Call the base class render function
	Object.getPrototypeOf(Object.getPrototypeOf(this)).render.call(this,parent,nextSibling);
	this.shortcutKeysList = [], // Stores the shortcut-key descriptors
	this.shortcutActionList = [], // Stores the corresponding action strings
	this.shortcutParsedList = []; // Stores the parsed key descriptors
	this.shortcutPriorityList = []; // Stores the parsed shortcut priority
	this.updateShortcutLists(this.getShortcutTiddlerList());
	this.hasStylesheetTag = this.wiki.getTiddler(this.editTitle).hasTag("$:/tags/Stylesheet");
	//this.engine.updateKeymaps();
	var lineNumbers = this.wiki.getTiddlerText("$:/config/codemirror-6/lineNumbers") === "yes" && this.editClass?.indexOf("tc-edit-texteditor-body") !== -1;
	this.engine.toggleLineNumbers(lineNumbers);
	this.engine.toggleFoldGutter(lineNumbers);
	var highlightActiveLine = this.wiki.getTiddlerText("$:/config/codemirror-6/highlightActiveLine") === "yes" && this.editClass?.indexOf("tc-edit-texteditor-body") !== -1;
	this.engine.toggleHighlightActiveLine(highlightActiveLine);
	this.engine.toggleHighlightActiveLineGutter(highlightActiveLine);
	var autocorrect = this.wiki.getTiddlerText("$:/config/codemirror-6/autocorrect") === "yes";
	this.engine.toggleAutocorrect(autocorrect);
	var completeAnyWord = this.wiki.getTiddlerText("$:/config/codemirror-6/completeAnyWord") === "yes";
	this.engine.toggleCompleteAnyWord(completeAnyWord);
	var selectOnOpen = this.wiki.getTiddlerText("$:/config/codemirror-6/selectOnOpen") === "yes";
	var autocompleteIcons = this.wiki.getTiddlerText("$:/config/codemirror-6/autocompleteIcons") === "yes";
	var maxRenderedOptions = parseInt(this.wiki.getTiddlerText("$:/config/codemirror-6/maxRenderedOptions"));
	var activateOnTyping = this.wiki.getTiddlerText("$:/config/codemirror-6/activateOnTyping") === "yes";
	this.engine.toggleAutocompletion(selectOnOpen,autocompleteIcons,maxRenderedOptions,activateOnTyping);
	var completeAnyWord = this.wiki.getTiddlerText("$:/config/codemirror-6/completeAnyWord") === "yes";
	this.engine.toggleCompleteAnyWord(completeAnyWord);
	var translate = this.wiki.getTiddlerText("$:/state/codemirror-6/translate/" + this.editTitle) === "yes";
	this.engine.toggleTranslate(translate);
	this.engine.updateIndentUnit();
	var bracketMatching = this.wiki.getTiddlerText("$:/config/codemirror-6/bracketMatching") === "yes";
	this.engine.toggleBracketMatching(bracketMatching);
	var closeBrackets = this.wiki.getTiddlerText("$:/config/codemirror-6/closeBrackets") === "yes";
	this.engine.toggleCloseBrackets(closeBrackets);
	var spellcheck = this.wiki.getTiddlerText("$:/config/codemirror-6/spellcheck") === "yes";
	this.engine.toggleSpellcheck(spellcheck);
	this.engine.updateTiddlerType();
};

exports.prototype.getShortcutTiddlerList = function() {
	return this.wiki.getTiddlersWithTag("$:/tags/KeyboardShortcut/CodeMirror");
};

exports.prototype.detectNewShortcuts = function(changedTiddlers) {
	var shortcutConfigTiddlers = [],
		handled = false;
	$tw.utils.each($tw.keyboardManager.lookupNames,function(platformDescriptor) {
		var descriptorString = "$:/config/" + platformDescriptor + "/";
		Object.keys(changedTiddlers).forEach(function(configTiddler) {
			var configString = configTiddler.substr(0, configTiddler.lastIndexOf("/") + 1);
			if(configString === descriptorString) {
				shortcutConfigTiddlers.push(configTiddler);
				handled = true;
			}
		});
	});
	if(handled) {
		return $tw.utils.hopArray(changedTiddlers,shortcutConfigTiddlers);
	} else {
		return false;
	}
};

exports.prototype.updateShortcutLists = function(tiddlerList) {
	this.shortcutTiddlers = tiddlerList;
	for(var i=0; i<tiddlerList.length; i++) {
		var title = tiddlerList[i],
			tiddlerFields = $tw.wiki.getTiddler(title).fields;
		this.shortcutKeysList[i] = tiddlerFields.key !== undefined ? tiddlerFields.key : undefined;
		this.shortcutActionList[i] = tiddlerFields.text;
		this.shortcutParsedList[i] = this.shortcutKeysList[i] !== undefined ? $tw.keyboardManager.parseKeyDescriptors(this.shortcutKeysList[i]) : undefined;
		this.shortcutPriorityList[i] = tiddlerFields.priority === "yes" ? true : false;
	}
};

exports.prototype.execute = function() {
	Object.getPrototypeOf(Object.getPrototypeOf(this)).execute.call(this);
	this.editType = this.getAttribute("type","");
};

/*
Handle an edit text operation message from the toolbar
*/
exports.prototype.handleEditTextOperationMessage = function(event) {
	// Prepare information about the operation
	var operation = this.engine.createTextOperation(event.param);
	// Invoke the handler for the selected operation
	var handler = this.editorOperations[event.param];
	if(handler) {
		handler.call(this,event,operation);
	}
	// Execute the operation via the engine
	var newText = this.engine.executeTextOperation(operation);
	// Fix the tiddler height and save changes
	this.engine.fixHeight();
	this.saveChanges(newText);
};

exports.prototype.handlePasteEvent = function(event) {
	if(event.clipboardData && event.clipboardData.files && event.clipboardData.files.length) {
		event.preventDefault();
		event.stopPropagation();
		this.dispatchDOMEvent(this.cloneEvent(event,["clipboardData"]));
		return true;
	}
	return false;
};

exports.prototype.refresh = function(changedTiddlers) {
	var changedAttributes = this.computeAttributes();
	if(changedAttributes["class"]) {
		this.engine.assignDomNodeClasses();
	}
	var hasStylesheetTag = this.wiki.getTiddler(this.editTitle).hasTag("$:/tags/Stylesheet");
	if(hasStylesheetTag !== this.hasStylesheetTag) {
		this.hasStylesheetTag = hasStylesheetTag;
		this.engine.updateTiddlerType();
	}
	if(changedTiddlers["$:/config/codemirror-6/indentWithTab"]) {
		var indentWithTab = this.wiki.getTiddlerText("$:/config/codemirror-6/indentWithTab") === "yes";
		if(indentWithTab && this.engine.currentKeymap.indexOf(this.engine.indentWithTab) === -1) {
			this.engine.currentKeymap.push(this.engine.indentWithTab);
		} else {
			var index = this.engine.currentKeymap.indexOf(this.engine.indentWithTab);
			if(index !== -1) {
				this.engine.currentKeymap.splice(index,1);
			}
		}
		this.engine.updateKeymap();
	}
	if(changedTiddlers["$:/config/codemirror-6/spellcheck"]) {
		var spellcheck = this.wiki.getTiddlerText("$:/config/codemirror-6/spellcheck") === "yes";
		this.engine.toggleSpellcheck(spellcheck);
	}
	if(changedTiddlers["$:/config/codemirror-6/lineNumbers"]) {
		var lineNumbers = this.wiki.getTiddlerText("$:/config/codemirror-6/lineNumbers") === "yes" && this.editClass?.indexOf("tc-edit-texteditor-body") !== -1;
		this.engine.toggleLineNumbers(lineNumbers);
		this.engine.toggleFoldGutter(lineNumbers);
	}
	if(changedTiddlers["$:/config/codemirror-6/highlightActiveLine"]) {
		var highlightActiveLine = this.wiki.getTiddlerText("$:/config/codemirror-6/highlightActiveLine") === "yes" && this.editClass?.indexOf("tc-edit-texteditor-body") !== -1;
		this.engine.toggleHighlightActiveLine(highlightActiveLine);
		this.engine.toggleHighlightActiveLineGutter(highlightActiveLine);
	}
	if(changedTiddlers["$:/config/codemirror-6/autocorrect"]) {
		var autocorrect = this.wiki.getTiddlerText("$:/config/codemirror-6/autocorrect") === "yes";
		this.engine.toggleAutocorrect(autocorrect);
	}
	if(changedTiddlers["$:/config/codemirror-6/activateOnTyping"] || changedTiddlers["$:/config/codemirror-6/selectOnOpen"] || changedTiddlers["$:/config/codemirror-6/autocompleteIcons"] || changedTiddlers["$:/config/codemirror-6/maxRenderedOptions"]) {
		var selectOnOpen = this.wiki.getTiddlerText("$:/config/codemirror-6/selectOnOpen") === "yes";
		var autocompleteIcons = this.wiki.getTiddlerText("$:/config/codemirror-6/autocompleteIcons") === "yes";
		var maxRenderedOptions = parseInt(this.wiki.getTiddlerText("$:/config/codemirror-6/maxRenderedOptions"));
		var activateOnTyping = this.wiki.getTiddlerText("$:/config/codemirror-6/activateOnTyping") === "yes";
		this.engine.toggleAutocompletion(selectOnOpen,autocompleteIcons,maxRenderedOptions,activateOnTyping);
	}
	if(changedTiddlers["$:/config/codemirror-6/completeAnyWord"]) {
		var completeAnyWord = this.wiki.getTiddlerText("$:/config/codemirror-6/completeAnyWord") === "yes";
		this.engine.toggleCompleteAnyWord(completeAnyWord);
	}
	if(changedTiddlers["$:/state/codemirror-6/translate/" + this.editTitle]) {
		var translate = this.wiki.getTiddlerText("$:/state/codemirror-6/translate/" + this.editTitle) === "yes";
		this.engine.toggleTranslate(translate);
	}
	if(changedTiddlers["$:/config/codemirror-6/indentUnit"] || changedTiddlers["$:/config/codemirror-6/indentUnitMultiplier"]) {
		this.engine.updateIndentUnit();
	}
	if(changedTiddlers["$:/config/codemirror-6/bracketMatching"]) {
		var bracketMatching = this.wiki.getTiddlerText("$:/config/codemirror-6/bracketMatching") === "yes";
		this.engine.toggleBracketMatching(bracketMatching);
	}
	if(changedTiddlers["$:/config/codemirror-6/closeBrackets"]) {
		var closeBrackets = this.wiki.getTiddlerText("$:/config/codemirror-6/closeBrackets") === "yes";
		this.engine.toggleCloseBrackets(closeBrackets);
	}
	var newList = this.getShortcutTiddlerList();
	var hasChanged = $tw.utils.hopArray(changedTiddlers,this.shortcutTiddlers) ? true :
		($tw.utils.hopArray(changedTiddlers,newList) ? true :
		(this.detectNewShortcuts(changedTiddlers))
	);
	// Re-cache shortcuts if something changed
	if(hasChanged) {
		this.updateShortcutLists(newList);
		//this.engine.updateKeymaps();
	}
	if(changedAttributes.type || changedTiddlers["$:/config/codemirror-6/sqlDialect"]) {
		this.engine.updateTiddlerType();
	}
	// Call the base class refresh function
	Object.getPrototypeOf(Object.getPrototypeOf(this)).refresh.call(this,changedTiddlers);
};

})();
