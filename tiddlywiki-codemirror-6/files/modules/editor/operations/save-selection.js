/*\
title: $:/core/modules/editor/operations/text/save-selection.js
type: application/javascript
module-type: texteditoroperation

Text editor operation to save the current selection in a specified tiddler

Production-ready refactor:
- hardening for missing event/paramObject/tiddler/field
- consistent behavior for single + multi selection
- uses Array.isArray instead of instanceof Array
- never relies on local reassignment (operation = null) that doesn't propagate
- makes this a "side-effect only" operation by marking type = "focus-editor" (no text changes)
- safe defaults for missing text/selStart/selEnd
- preserves original multi-selection join behavior (" ")

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

function getParams(event) {
	var p = (event && event.paramObject) ? event.paramObject : {};
	var tiddler = p.tiddler ? String(p.tiddler) : "";
	var field = p.field ? String(p.field) : "text";
	return { tiddler: tiddler, field: field };
}

function safePos(n, fallback) {
	return (isFinite(n) && n >= 0) ? n : fallback;
}

function getSlice(op) {
	var text = (op && typeof op.text === "string") ? op.text : "";
	var from = safePos(op && op.selStart, 0);
	var to = safePos(op && op.selEnd, from);
	return text.substring(from, to);
}

function markNoChange(operation) {
	// Ensure engines don't try to apply text changes.
	if (Array.isArray(operation)) {
		operation.length = 0;
		operation.type = "focus-editor";
		return;
	}
	if (operation && typeof operation === "object") {
		operation.type = "focus-editor";
		operation.cutStart = null;
		operation.cutEnd = null;
		operation.replacement = null;
		operation.newSelStart = null;
		operation.newSelEnd = null;
	}
}

exports["save-selection"] = function (event, operation) {
	var params = getParams(event);

	// If target not provided, do nothing but keep editor stable
	if (!params.tiddler || !params.field) {
		markNoChange(operation);
		return;
	}

	if (Array.isArray(operation)) {
		var parts = [];
		for (var i = 0; i < operation.length; i++) {
			parts.push(getSlice(operation[i]));
		}
		this.wiki.setText(params.tiddler, params.field, null, parts.join(" "));
		markNoChange(operation);
		return;
	}

	if (operation && typeof operation === "object") {
		this.wiki.setText(params.tiddler, params.field, null, getSlice(operation));
		markNoChange(operation);
	}
};
