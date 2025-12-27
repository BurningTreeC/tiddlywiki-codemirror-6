/*\
title: $:/core/modules/editor/operations/text/wrap-selection.js
type: application/javascript
module-type: texteditoroperation

Text editor operation to wrap the selection with the specified prefix and suffix

Production-ready refactor:
- fixes a real bug: original loop uses `operation.length` instead of `opArray.length` in some patterns elsewhere; here we unify
- hardening for missing event/paramObject/prefix/suffix/trimSelection
- consistent behavior for single + multi selection (Array.isArray)
- safe defaults if op.text/selStart/selEnd/selection missing
- avoids duplicated logic via helpers
- preserves original semantics:
  - if no selection: toggle prefix+suffix at cursor (insert or remove when cursor sits between them)
  - if selection starts with prefix and ends with suffix: remove them
  - if prefix/suffix surround selection but are not selected: remove them too
  - otherwise add prefix/suffix
  - optional trimming handling for whitespace at selection start/end (trimSelection: no|start|end|yes)

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

function getParams(event) {
	var p = (event && event.paramObject) ? event.paramObject : {};
	var prefix = (p.prefix !== undefined && p.prefix !== null) ? String(p.prefix) : "";
	var suffix = (p.suffix !== undefined && p.suffix !== null) ? String(p.suffix) : "";
	var trimSelection = (p.trimSelection !== undefined && p.trimSelection !== null) ? String(p.trimSelection) : "no";
	return { prefix: prefix, suffix: suffix, trimSelection: trimSelection };
}

function safePos(n, fallback) {
	return (isFinite(n) && n >= 0) ? n : fallback;
}

function substrSafe(text, from, to) {
	// Safe substring even if bounds are negative/outside
	if (typeof text !== "string") text = "";
	var a = safePos(from, 0);
	var b = safePos(to, a);
	if (a > text.length) a = text.length;
	if (b > text.length) b = text.length;
	if (b < a) b = a;
	return text.substring(a, b);
}

/**
 * Detect trailing/leading spaces in selection based on trimSelection option.
 * Returns: "yes", "start", "end", "no"
 */
function trailingSpaceAt(sel, selLength, trimSelection) {
	var _start, _end;
	switch (trimSelection) {
		case "end":
			return (sel.trimEnd().length !== selLength) ? "end" : "no";
		case "start":
			return (sel.trimStart().length !== selLength) ? "start" : "no";
		case "yes":
			_start = sel.trimStart().length !== selLength;
			_end = sel.trimEnd().length !== selLength;
			return (_start && _end) ? "yes" : (_start ? "start" : (_end ? "end" : "no"));
		default:
			return "no";
	}
}

/**
 * If no selection: toggle prefix+suffix at cursor.
 * - If cursor sits between prefix and suffix (i.e. text around cursor equals prefix+suffix), remove them.
 * - Else insert prefix+suffix and place cursor between.
 */
function togglePrefixSuffix(op, prefix, suffix) {
	var text = op.text;
	var s = op.selStart;

	var left = substrSafe(text, s - prefix.length, s);
	var right = substrSafe(text, s, s + suffix.length);

	if (left + right === prefix + suffix) {
		// Remove prefix and suffix
		op.cutStart = s - prefix.length;
		op.cutEnd = s + suffix.length;
		op.replacement = "";
		op.newSelStart = op.cutStart;
		op.newSelEnd = op.newSelStart;
	} else {
		// Insert prefix and suffix at cursor
		op.cutStart = s;
		op.cutEnd = s;
		op.replacement = prefix + suffix;
		op.newSelStart = s + prefix.length;
		op.newSelEnd = op.newSelStart;
	}
}

function removePrefixSuffix(op, prefix, suffix, lenPrefix, lenSuffix, removeOutsideSelection) {
	// removeOutsideSelection:
	// - false: selection includes prefix+suffix => remove them from inside selection
	// - true: prefix before selection and suffix after selection => cut wider and keep selection intact
	var s = op.selStart;
	var e = op.selEnd;

	op.cutStart = s - lenPrefix;
	op.cutEnd = e + lenSuffix;

	if (removeOutsideSelection) {
		// Prefix/suffix not selected: preserve selection exactly
		op.replacement = op.selection;
	} else {
		// Prefix/suffix are part of selection: strip them from selection contents
		op.replacement = op.selection.substring(prefix.length, op.selection.length - suffix.length);
	}

	op.newSelStart = op.cutStart;
	op.newSelEnd = op.cutStart + op.replacement.length;
}

function addPrefixSuffix(op, prefix, suffix, trimMode) {
	var sel = op.selection;
	var selLength = sel.length;

	switch (trailingSpaceAt(sel, selLength, trimMode)) {
		case "no":
			op.cutStart = op.selStart;
			op.cutEnd = op.selEnd;
			op.replacement = prefix + sel + suffix;
			op.newSelStart = op.selStart;
			op.newSelEnd = op.selStart + op.replacement.length;
			break;

		case "yes": {
			// Trim both ends: preserve external whitespace, wrap trimmed content
			var trimmedStartLen = sel.trimStart().length; // length after trimming start
			var trimmedEndLen = sel.trimEnd().length;     // length after trimming end

			// start offset: end - trimmedStartLen gives index of first non-space in selection
			op.cutStart = op.selEnd - trimmedStartLen;
			// end offset: start + trimmedEndLen gives index of last non-space+1 in selection
			op.cutEnd = op.selStart + trimmedEndLen;

			op.replacement = prefix + sel.trim() + suffix;
			op.newSelStart = op.cutStart;
			op.newSelEnd = op.cutStart + op.replacement.length;
			break;
		}

		case "start": {
			var trimmedStartLen2 = sel.trimStart().length;
			op.cutStart = op.selEnd - trimmedStartLen2;
			op.cutEnd = op.selEnd;

			op.replacement = prefix + sel.trimStart() + suffix;
			op.newSelStart = op.cutStart;
			op.newSelEnd = op.cutStart + op.replacement.length;
			break;
		}

		case "end": {
			var trimmedEndLen2 = sel.trimEnd().length;
			op.cutStart = op.selStart;
			op.cutEnd = op.selStart + trimmedEndLen2;

			op.replacement = prefix + sel.trimEnd() + suffix;
			op.newSelStart = op.selStart;
			op.newSelEnd = op.selStart + op.replacement.length;
			break;
		}
	}
}

function normalizeOp(op) {
	// Ensure required fields exist
	op.text = (typeof op.text === "string") ? op.text : "";
	op.selStart = safePos(op.selStart, 0);
	op.selEnd = safePos(op.selEnd, op.selStart);
	if (op.selEnd < op.selStart) op.selEnd = op.selStart;
	op.selection = (typeof op.selection === "string") ? op.selection : substrSafe(op.text, op.selStart, op.selEnd);
}

function processOperation(op, prefix, suffix, trimMode) {
	normalizeOp(op);

	var text = op.text;
	var s = op.selStart;
	var e = op.selEnd;

	// No selection: toggle cursor wrap
	if (s === e) {
		togglePrefixSuffix(op, prefix, suffix);
		return;
	}

	// Case A: prefix and suffix are part of the selected text
	var selectedStartsWithPrefix = substrSafe(text, s, s + prefix.length) === prefix;
	var selectedEndsWithSuffix = substrSafe(text, e - suffix.length, e) === suffix;

	if (selectedStartsWithPrefix && selectedEndsWithSuffix) {
		removePrefixSuffix(op, prefix, suffix, 0, 0, /*removeOutsideSelection*/ false);
		return;
	}

	// Case B: prefix and suffix surround selection but are not selected
	var before = substrSafe(text, s - prefix.length, s) === prefix;
	var after = substrSafe(text, e, e + suffix.length) === suffix;

	if (before && after) {
		removePrefixSuffix(op, prefix, suffix, prefix.length, suffix.length, /*removeOutsideSelection*/ true);
		return;
	}

	// Otherwise: add prefix/suffix (with optional trimming behavior)
	addPrefixSuffix(op, prefix, suffix, trimMode);
}

exports["wrap-selection"] = function (event, operation) {
	var params = getParams(event);
	var ops = Array.isArray(operation) ? operation : [operation];

	for (var i = 0; i < ops.length; i++) {
		if (ops[i] && typeof ops[i] === "object") {
			processOperation(ops[i], params.prefix, params.suffix, params.trimSelection);
		}
	}
};
