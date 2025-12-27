/*\
title: $:/core/modules/editor/operations/text/make-link.js
type: application/javascript
module-type: texteditoroperation

Text editor operation to make a link

Production-ready refactor:
- hardening for missing event/paramObject/text
- consistent behavior for single + multi selection
- uses Array.isArray instead of instanceof Array
- trims/normalizes target text, preserves selection as caption if present
- safe defaults if selStart/selEnd missing
- avoids duplicated logic via helpers

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

function getTargetText(event) {
	var t = event && event.paramObject ? event.paramObject.text : "";
	if (t === undefined || t === null) t = "";
	// TW link targets should not contain newlines; normalize + trim
	t = String(t).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
	return t;
}

function applyMakeLink(op, target) {
	var from = op && isFinite(op.selStart) ? op.selStart : 0;
	var to = op && isFinite(op.selEnd) ? op.selEnd : from;

	var selection = (op && typeof op.selection === "string") ? op.selection : "";
	// Keep original semantics: if selection exists, treat it as caption
	// [[caption|target]] else [[target]]
	var replacement;
	if (selection) {
		replacement = "[[" + selection + "|" + target + "]]";
	} else {
		replacement = "[[" + target + "]]";
	}

	op.replacement = replacement;
	op.cutStart = from;
	op.cutEnd = to;

	var caret = from + replacement.length;
	op.newSelStart = caret;
	op.newSelEnd = caret;
}

exports["make-link"] = function (event, operation) {
	var target = getTargetText(event);

	// If target is empty, don't insert broken links; treat as no-op insert of selection or empty link?
	// Production-safe: if empty, create a placeholder to avoid malformed [[|]].
	if (!target) target = "link";

	if (Array.isArray(operation)) {
		for (var i = 0; i < operation.length; i++) {
			applyMakeLink(operation[i], target);
		}
		return;
	}

	if (operation && typeof operation === "object") {
		applyMakeLink(operation, target);
	}
};
