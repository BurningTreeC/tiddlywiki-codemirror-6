/*\
title: $:/core/modules/editor/operations/text/replace-all.js
type: application/javascript
module-type: texteditoroperation

Text editor operation to replace the entire text

Production-ready refactor:
- hardening for missing event/paramObject/text
- consistent newline normalization for both single + multi selection
- uses Array.isArray instead of instanceof Array
- safe defaults if op.text missing
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

function applyReplaceAll(op, replacement) {
	var text = (op && typeof op.text === "string") ? op.text : "";

	op.cutStart = 0;
	op.cutEnd = text.length;

	op.replacement = replacement;
	op.newSelStart = 0;
	op.newSelEnd = replacement.length;
}

exports["replace-all"] = function (event, operation) {
	var replacement = getReplacementText(event);

	if (Array.isArray(operation)) {
		for (var i = 0; i < operation.length; i++) {
			applyReplaceAll(operation[i], replacement);
		}
		return;
	}

	if (operation && typeof operation === "object") {
		applyReplaceAll(operation, replacement);
	}
};

