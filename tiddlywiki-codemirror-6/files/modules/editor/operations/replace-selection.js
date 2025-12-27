/*\
title: $:/core/modules/editor/operations/text/replace-selection.js
type: application/javascript
module-type: texteditoroperation

Text editor operation to replace the selection

Production-ready refactor:
- hardening for missing event/paramObject/text
- consistent newline normalization for both single + multi selection
- uses Array.isArray instead of instanceof Array
- safe defaults if selStart/selEnd missing
- avoids duplicated logic via helpers

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

function getReplacementText(event) {
	var t = event && event.paramObject ? event.paramObject.text : "";
	if (t === undefined || t === null) t = "";
	return String(t).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function safePos(n, fallback) {
	return (isFinite(n) && n >= 0) ? n : fallback;
}

function applyReplaceSelection(op, replacement) {
	var from = safePos(op && op.selStart, 0);
	var to = safePos(op && op.selEnd, from);

	op.replacement = replacement;
	op.cutStart = from;
	op.cutEnd = to;
	op.newSelStart = from;
	op.newSelEnd = from + replacement.length;
}

exports["replace-selection"] = function (event, operation) {
	var replacement = getReplacementText(event);

	if (Array.isArray(operation)) {
		for (var i = 0; i < operation.length; i++) {
			applyReplaceSelection(operation[i], replacement);
		}
		return;
	}

	if (operation && typeof operation === "object") {
		applyReplaceSelection(operation, replacement);
	}
};
