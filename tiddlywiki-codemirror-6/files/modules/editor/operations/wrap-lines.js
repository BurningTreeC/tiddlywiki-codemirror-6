/*\
title: $:/core/modules/editor/operations/text/wrap-lines.js
type: application/javascript
module-type: texteditoroperation

Text editor operation to wrap the selected lines with a prefix and suffix

Production-ready refactor:
- fixes a real bug: original loop used `operation.length` even when operation was not an array
- hardening for missing event/paramObject/prefix/suffix
- consistent behavior for single + multi selection (Array.isArray)
- safe defaults if op.text/selStart/selEnd missing
- avoids duplicated logic via helpers
- preserves original toggle semantics: if already wrapped, unwrap; otherwise wrap whole selected lines

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

function getParams(event) {
	var p = (event && event.paramObject) ? event.paramObject : {};
	return {
		prefix: (p.prefix !== undefined && p.prefix !== null) ? String(p.prefix) : "",
		suffix: (p.suffix !== undefined && p.suffix !== null) ? String(p.suffix) : ""
	};
}

function safePos(n, fallback) {
	return (isFinite(n) && n >= 0) ? n : fallback;
}

function processOperation(op, prefix, suffix) {
	var text = (op && typeof op.text === "string") ? op.text : "";
	var selStart = safePos(op && op.selStart, 0);
	var selEnd = safePos(op && op.selEnd, selStart);

	// Check if selection is already wrapped as:
	// prefix + "\n" + (selection) + "\n" + suffix
	var before = text.substring(0, selStart);
	var after = text.substring(selEnd);

	var wrappedBefore = $tw.utils.endsWith(before, prefix + "\n");
	var wrappedAfter = $tw.utils.startsWith(after, "\n" + suffix);

	if (wrappedBefore && wrappedAfter) {
		// Unwrap: remove prefix/suffix around selection
		op.cutStart = selStart - (prefix.length + 1);
		op.cutEnd = selEnd + (suffix.length + 1);

		// Also cut the following newline (if present), matching original behavior
		if (text.charAt(op.cutEnd) === "\n") {
			op.cutEnd++;
		}

		op.replacement = text.substring(selStart, selEnd);

		// Select text that was in between prefix and suffix
		op.newSelStart = op.cutStart;
		op.newSelEnd = op.newSelStart + op.replacement.length;
		return;
	}

	// Wrap whole selected lines
	op.cutStart = $tw.utils.findPrecedingLineBreak(text, selStart);
	op.cutEnd = $tw.utils.findFollowingLineBreak(text, selEnd);

	op.replacement =
		prefix + "\n" +
		text.substring(op.cutStart, op.cutEnd) + "\n" +
		suffix + "\n";

	op.newSelStart = op.cutStart + prefix.length + 1;
	op.newSelEnd = op.newSelStart + (op.cutEnd - op.cutStart);
}

exports["wrap-lines"] = function (event, operation) {
	var params = getParams(event);
	var ops = Array.isArray(operation) ? operation : [operation];

	for (var i = 0; i < ops.length; i++) {
		if (ops[i] && typeof ops[i] === "object") {
			processOperation(ops[i], params.prefix, params.suffix);
		}
	}
};
