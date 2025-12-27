/*\
title: $:/core/modules/editor/operations/text/insert-text.js
type: application/javascript
module-type: texteditoroperation

Text editor operation: insert text at the caret position.
If there is a selection it is replaced.

Production-ready refactor:
- hardening for missing event/paramObject/text
- consistent newline normalization for both single + multi selection
- uses Array.isArray instead of instanceof Array
- avoids repeated indexing and keeps positions consistent
- safe defaults if selStart/selEnd are missing

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

function getParamText(event) {
	var t = event && event.paramObject ? event.paramObject.text : "";
	if (t === undefined || t === null) t = "";
	// Normalize CRLF/CR to LF consistently
	return String(t).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function applyInsert(op, replacement) {
	var from = op && isFinite(op.selStart) ? op.selStart : 0;
	var to = op && isFinite(op.selEnd) ? op.selEnd : from;

	op.replacement = replacement;
	op.cutStart = from;
	op.cutEnd = to;

	var caret = from + replacement.length;
	op.newSelStart = caret;
	op.newSelEnd = caret;
}

exports["insert-text"] = function (event, operation) {
	var replacement = getParamText(event);

	if (Array.isArray(operation)) {
		for (var i = 0; i < operation.length; i++) {
			applyInsert(operation[i], replacement);
		}
		return;
	}

	if (operation && typeof operation === "object") {
		applyInsert(operation, replacement);
	}
};
