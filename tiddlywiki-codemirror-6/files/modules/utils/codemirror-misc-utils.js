/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/utils/codemirror-misc-utils.js
type: application/javascript
module-type: codemirror-utils

\*/

(function() {

"use strict";

exports.validateRegex = function(regex) {
	try {
		new RegExp(regex);
		return true;
	} catch(e) {
		return false;
	}
};

var keymap = {
	cursorCharLeft: ["Left"],
	selectCharLeft: ["shift-Left"],
	cursorCharRight: ["Right"],
	selectCharRight: ["shift-Right"],
	cursorGroupLeft: ["ctrl-Left"],
	selectGroupLeft: ["ctrl-shift-Left"],
	cursorGroupRight: ["ctrl-Right"],
	selectGroupRight: ["ctrl-shift-Right"],
	cursorLineUp: ["Up"],
	selectLineUp: ["shift-Up"],
	cursorLineDown: ["Down"],
	selectLineDown: ["shift-Down"],
	cursorPageUp: ["Page_up"],
	selectPageUp: ["shift-Page_up"],
	cursorPageDown: ["Page_down"],
	selectPageDown: ["shift-Page_down"],
	cursorLineBoundaryBackward: ["Home"],
	selectLineBoundaryBackward: ["shift-Home"],
	cursorLineBoundaryForward: ["End"],
	selectLineBoundaryForward: ["shift-End"],
	cursorDocStart: ["ctrl-Home"],
	selectDocStart: ["ctrl-shift-Home"],
	cursorDocEnd: ["ctrl-End"],
	insertNewlineAndIndent: ["Enter","shift-Enter"],
	selectAll: ["ctrl-A"],
	deleteCharBackward: ["Backspace"],
	deleteCharForward: ["Delete"],
	deleteGroupBackward: ["ctrl-Backspace"],
	deleteGroupForward: ["ctrl-Delete"],
	cursorSyntaxLeft: ["alt-Left"],
	selectSyntaxLeft: ["shift-alt-Left"],
	cursorSyntaxRight: ["alt-Right"],
	selectSyntaxRight: ["shift-alt-Right"],
	moveLineUp: ["alt-Up"],
	moveLineDown: ["alt-Down"],
	copyLineUp: ["shift-alt-Up"],
	copyLineDown: ["shift-alt-Down"],
	simplifySelection: ["Escape"],
	insertBlankLine: ["ctrl-Enter"],
	selectLine: ["alt-L"],
	selectParentSyntax: ["ctrl-I"],
	indentLess: ["ctrl-["],
	indentMore: ["ctrl-]"],
	indentSelection: ["ctrl-alt-\\"],
	deleteLine: ["ctrl-shift-K"],
	cursorMatchingBracket: ["ctrl-shift-\\"],
	toggleComment: ["ctrl-/"],
	toggleBlockComment: ["shift-alt-A"],
	toggleTabFocusMode: ["ctrl-M"],
	undo: ["ctrl-Z"],
	redo: ["ctrl-Y"],
	undoSelection: ["ctrl-U"],
	redoSelection: ["ctrl-shift-U"],
	openSearchPanel: ["ctrl-F"],
	findNext: ["F3","ctrl-G"],
	findPrevious: ["shift-F3","ctrl-shift-G"],
	gotoLine: ["ctrl-alt-G"],
	selectNextOccurrence: ["ctrl-D"],
	startCompletion: ["ctrl-Space"],
	closeCompletion: ["Escape"],
	acceptCompletion: ["Enter"]
};

exports.keymap = keymap;

exports.keymapAll = {
	cursorCharLeft: keymap.cursorCharLeft,
	selectCharLeft: keymap.selectCharLeft,
	cursorCharRight: keymap.cursorCharRight,
	selectCharRight: keymap.selectCharRight,
	cursorLineUp: keymap.cursorLineUp,
	selectLineUp: keymap.selectLineUp,
	cursorLineDown: keymap.cursorLineDown,
	selectLineDown: keymap.selectLineDown,
	cursorPageUp: keymap.cursorPageUp,
	selectPageUp: keymap.selectPageUp,
	cursorPageDown: keymap.cursorPageDown,
	selectPageDown: keymap.selectPageDown,
	cursorLineBoundaryBackward: keymap.cursorLineBoundaryBackward,
	selectLineBoundaryBackward: keymap.selectLineBoundaryBackward,
	cursorLineBoundaryForward: keymap.cursorLineBoundaryForward,
	selectLineBoundaryForward: keymap.selectLineBoundaryForward,
	insertNewlineAndIndent: keymap.insertNewlineAndIndent,
	deleteCharBackward: keymap.deleteCharBackward,
	deleteCharForward: keymap.deleteCharForward,
	moveLineUp: keymap.moveLineUp,
	moveLineDown: keymap.moveLineDown,
	copyLineUp: keymap.copyLineUp,
	copyLineDown: keymap.copyLineDown,
	simplifySelection: keymap.simplifySelection,
	toggleBlockComment: keymap.toggleBlockComment,
	closeCompletion: keymap.closeCompletion,
	acceptCompletion: keymap.acceptCompletion
};

exports.keymapMac = {
	cursorGroupLeft: ["alt-Left"],
	selectGroupLeft: ["shift-alt-Left"],
	cursorGroupRight: ["alt-Right"],
	selectGroupRight: ["shift-alt-Right"],
	cursorLineStart: ["cmd-Left"],
	selectLineStart: ["cmd-shift-Left"],
	cursorLineEnd: ["cmd-Right"],
	selectLineEnd: ["cmd-shift-Right"],
	cursorDocStart: ["cmd-Up","cmd-Home"],
	selectDocStart: ["cmd-shift-Up","cmd-shift-Home"],
	cursorDocEnd: ["cmd-Down","cmd-End"],
	selectDocEnd: ["cmd-shift-Down","cmd-shift-End"],
	cursorPageUp: ["ctrl-Up"],
	selectPageUp: ["ctrl-shift-Up"],
	cursorPageDown: ["ctrl-Down"],
	selectPageDown: ["ctrl-shift-Down"],
	selectAll: ["cmd-A"],
	deleteGroupBackward: ["alt-Backspace"],
	deleteGroupForward: ["alt-Delete"],
	deleteLineBoundaryBackward: ["cmd-Backspace"],
	deleteLineBoundaryForward: ["cmd-Delete"],
	cursorSyntaxLeft: ["ctrl-Left"],
	selectSyntaxLeft: ["ctrl-shift-Left"],
	cursorSyntaxRight: ["ctrl-Right"],
	selectSyntaxRight: ["ctrl-shift-Right"],
	insertBlankLine: ["cmd-Enter"],
	selectLine: ["ctrl-L"],
	selectParentSyntax: ["cmd-I"],
	indentLess: ["cmd-["],
	indentMore: ["cmd-]"],
	indentSelection: ["cmd-alt-\\"],
	deleteLine: ["cmd-shift-K"],
	cursorMatchingBracket: ["cmd-shift-\\"],
	toggleComment: ["cmd-/"],
	toggleTabFocusMode: ["shift-alt-M"],
	undo: ["cmd-Z"],
	redo: ["cmd-shift-Z"],
	undoSelection: ["cmd-U"],
	redoSelection: ["cmd-shift-U"],
	openSearchPanel: ["cmd-F"],
	findNext: ["F3","cmd-G"],
	findPrevious: ["shift-F3","cmd-shift-G"],
	gotoLine: ["cmd-alt-G"],
	selectNextOccurrence: ["cmd-D"],
	startCompletion: ["alt-`"]
};

exports.keymapLinux = {
	redo: ["ctrl-shift-Z"]
};

exports.keymapWindows = {};

})();