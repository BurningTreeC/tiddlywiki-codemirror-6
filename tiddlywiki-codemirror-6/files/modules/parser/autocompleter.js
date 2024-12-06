/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/autocompleter.js
type: application/javascript
module-type: library

Autocompleter module for providing context-aware suggestions.

\*/
(function() {
"use strict";

// Require submodules
var populateLists = require("$:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/populateLists.js").populateLists;
var updateAutocompletionLists = require("$:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/updateAutocompletion.js").updateAutocompletionLists;

// Initialize data structures for autocompletion
var widgets = {};
var filterOperators = {};
var filterFunctions = {};
var tiddlers = {};
var tags = {};
var attributes = {};

/**
 * Initial population of autocompletion lists.
 */
populateLists(widgets, filterOperators, filterFunctions, tiddlers, tags, attributes);

/**
 * Provides autocompletion suggestions based on the current context.
 * @param {Object} context - The autocompletion context provided by CodeMirror.
 * @returns {Object|null} - The autocompletion options or null if no suggestions.
 */
function tiddlyWikiAutocomplete(context) {
    var word = context.matchBefore(/\w*/);
    if (!word || word.from === word.to) return null;

    var completions = [];

    // Get the token before the cursor to determine context
    var before = context.matchBefore(/<<|{{{?|<%|{|\[\w*\]/, { fallback: true });
    if (before) {
        var token = before.text;
        var cursorPos = context.pos;

        if (token === "<<") {
            // Widget completions
            for (var widgetName in widgets) {
                if (widgets.hasOwnProperty(widgetName)) {
                    completions.push({ label: widgetName, type: "widget" });
                }
            }
        } else if (token === "{{{") {
            // Macro completions
            for (var macroName in tiddlers) {
                if (tiddlers.hasOwnProperty(macroName)) {
                    completions.push({ label: macroName, type: "macro" });
                }
            }
        } else if (token === "{{") {
            // Transclusion completions
            for (var tiddlerName in tiddlers) {
                if (tiddlers.hasOwnProperty(tiddlerName)) {
                    completions.push({ label: tiddlerName, type: "tiddler" });
                }
            }
        } else if (token.startsWith("[") || token.startsWith("{") || token.startsWith("<")) {
            // Inside a filter expression or HTML attribute
            var currentLine = context.state.doc.lineAt(cursorPos);
            var lineText = currentLine.text.substring(0, cursorPos - currentLine.from);
            var filterMatch = lineText.match(/\[([^\]]*)$/); // Match the last '[' to the cursor
            if (filterMatch) {
                var filterText = filterMatch[1];
                var parsedFilter = $tw.utils.parseFilter(filterText);
                if (parsedFilter && parsedFilter.length > 0) {
                    var lastNode = parsedFilter[parsedFilter.length - 1];
                    if (lastNode.type === "operator") {
                        // Suggest filter operators
                        for (var operator in filterOperators) {
                            if (filterOperators.hasOwnProperty(operator)) {
                                completions.push({ label: operator, type: "tw-filter-operator" });
                            }
                        }
                    } else if (lastNode.type === "function") {
                        // Suggest filter functions
                        for (var func in filterFunctions) {
                            if (filterFunctions.hasOwnProperty(func)) {
                                completions.push({ label: func, type: "tw-filter-function" });
                            }
                        }
                    } else if (lastNode.type === "variable") {
                        // Suggest attributes or variables
                        for (var attr in attributes) {
                            if (attributes.hasOwnProperty(attr)) {
                                completions.push({ label: attr, type: "tw-filter-variable" });
                            }
                        }
                    }
                }
            }
        } else if (token === "<") {
            // Attribute completions within an HTML element
            for (var attr in attributes) {
                if (attributes.hasOwnProperty(attr)) {
                    completions.push({ label: attr, type: "attribute" });
                }
            }
        }
    } else {
        // General completions: attributes, tags, filter operators, widgets, etc.
        // Suggest attributes
        for (var attr in attributes) {
            if (attributes.hasOwnProperty(attr)) {
                completions.push({ label: attr, type: "attribute" });
            }
        }

        // Suggest tags
        for (var tag in tags) {
            if (tags.hasOwnProperty(tag)) {
                completions.push({ label: tag, type: "tag" });
            }
        }

        // Suggest filter operators
        for (var operator in filterOperators) {
            if (filterOperators.hasOwnProperty(operator)) {
                completions.push({ label: operator, type: "tw-filter-operator" });
            }
        }

        // Suggest filter functions
        for (var func in filterFunctions) {
            if (filterFunctions.hasOwnProperty(func)) {
                completions.push({ label: func, type: "tw-filter-function" });
            }
        }

        // Suggest widgets
        for (var widget in widgets) {
            if (widgets.hasOwnProperty(widget)) {
                completions.push({ label: widget, type: "widget" });
            }
        }

        // Suggest tiddler titles
        for (var tiddler in tiddlers) {
            if (tiddlers.hasOwnProperty(tiddler)) {
                completions.push({ label: tiddler, type: "tiddler" });
            }
        }
    }

    // Filter completions based on the current word (case-insensitive)
    var filteredCompletions = completions.filter(function(item) {
        return item.label.toLowerCase().startsWith(word.text.toLowerCase());
    });

    if (filteredCompletions.length === 0) return null;

    // Limit the number of suggestions to enhance performance (optional)
    var maxRenderedOptions = 100; // Define a reasonable limit
    filteredCompletions = filteredCompletions.slice(0, maxRenderedOptions);

    return {
        from: word.from,
        options: filteredCompletions,
        validFor: /^\w*$/
    };
}

/**
 * Registers event listeners to update autocompletion lists dynamically.
 * This ensures that any changes in tiddlers, widgets, or other components are reflected in autocompletion suggestions.
 */
function registerDynamicUpdates() {
    // Listen for changes in tiddlers
    $tw.hooks.addHook("th-patch-tiddler", function(patch, title, oldTiddler, newTiddler) {
        console.log(patch);
        // Update tiddlers and tags
        if (patch.fields.title) {
            tiddlers[newTiddler.fields.title] = true;
            delete tiddlers[oldTiddler.fields.title];
        }
        if (patch.fields.tags) {
            // Remove old tags
            if (oldTiddler.fields.tags) {
                oldTiddler.fields.tags.forEach(function(tag) {
                    delete tags[tag];
                });
            }
            // Add new tags
            if (newTiddler.fields.tags) {
                newTiddler.fields.tags.forEach(function(tag) {
                    tags[tag] = true;
                });
            }
        }
        // Update attributes or other fields if necessary
        // ...

        // Trigger a refresh of autocompletion lists
        updateAutocompletionLists();
    });

    // Listen for addition/removal of widgets, filter operators, etc.
    $tw.hooks.addHook("th-imported-modules", function(type, module) {
        if (type === "widget" && module.name) {
            widgets[module.name] = true;
        }
        if (type === "filteroperator" && module.name) {
            filterOperators[module.name] = true;
        }
        if (type === "filterfunction" && module.name) {
            filterFunctions[module.name] = true;
        }

        // Trigger a refresh of autocompletion lists
        updateAutocompletionLists();
    });

    $tw.hooks.addHook("th-unloaded-module", function(type, module) {
        if (type === "widget" && module.name) {
            delete widgets[module.name];
        }
        if (type === "filteroperator" && module.name) {
            delete filterOperators[module.name];
        }
        if (type === "filterfunction" && module.name) {
            delete filterFunctions[module.name];
        }

        // Trigger a refresh of autocompletion lists
        updateAutocompletionLists();
    });
}

// Initialize dynamic updates
registerDynamicUpdates();

// Export the autocompletion function
exports.tiddlyWikiAutocomplete = tiddlyWikiAutocomplete;

})();