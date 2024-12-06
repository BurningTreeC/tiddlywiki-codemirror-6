/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/main.js
type: application/javascript
module-type: library

Main extension module integrating tokenizer, parser, autocompleter, and highlight styles.

\*/
(function() {
    "use strict";

    // Require CodeMirror Dependencies
    var Dependencies = require("$:/plugins/BTC/tiddlywiki-codemirror-6/lib/codemirror-dependencies.js").CodeMirrorDependencies;

    // Access other modules
    var Tokenizer = require("$:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/tokenizer.js");
    var Parser = require("$:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/parser.js");
    var Autocompleter = require("$:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/autocompleter.js");
    var HighlightStyles = require("$:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/highlight-styles.js");

    /**
     * ViewPlugin to apply syntax highlighting based on tokens.
     * This plugin scans the document for tokens and applies Decorations accordingly.
     */
    var TiddlyWikiViewPlugin = Dependencies.view.ViewPlugin.define({
        // Create a state field to store tokens
        create: function() {
            return {
                tokens: []
            };
        },
        update: function(value, tr) {
            if (tr.docChanged) {
                // Re-parse the document to extract tokens
                var text = tr.state.doc.toString();
                var sanitizedText = Parser.replaceControlChars(text);
                var parsedTree = Parser.parseAndSanitize(sanitizedText);
                Parser.accumulatePositions(parsedTree, 0);
                var tokens = [];
                Tokenizer.extractTokens(parsedTree, tokens);

                // Parse definitions
                var definitions = Parser.parseDefinitions(sanitizedText);
                definitions.forEach(function(def) {
                    tokens.push({
                        type: `tw-${def.type}`,
                        name: def.name,
                        params: def.params,
                        start: def.start,
                        end: def.end
                    });
                });

                // Parse and tokenize any filters within 'value' attributes
                tokens.forEach(function(token) {
                    if (token.type === "tw-set" || token.type === "tw-function-definition" || token.type === "tw-element") {
                        if (token.value && typeof token.value === "string") {
                            // Detect if the value contains a filter
                            // TW5 filters are typically enclosed in square brackets []
                            var filterRegex = /\[([^\]]+)\]/g;
                            var match;
                            while ((match = filterRegex.exec(token.value)) !== null) {
                                var filterText = match[1];
                                Parser.parseAndTokenizeFilter(filterText, tokens);
                            }
                        }
                    }
                });

                // Update tokens in the state field
                value.tokens = tokens;
            }
            return value;
        },
        decorations: function(value) {
            var builder = Dependencies.view.Decoration.set();
            var tokens = value.tokens;

            tokens.forEach(function(token) {
                var deco;
                switch(token.type) {
                    case "tw-heading":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-heading" });
                        break;
                    case "tw-bold":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-bold" });
                        break;
                    case "tw-italic":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-italic" });
                        break;
                    case "tw-list":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-list" });
                        break;
                    case "tw-list-item":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-list-item" });
                        break;
                    case "tw-paragraph":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-paragraph" });
                        break;
                    case "tw-link":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-link" });
                        break;
                    case "tw-set":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-set" });
                        break;
                    case "tw-function-definition":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-function-definition" });
                        break;
                    case "tw-procedure-definition":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-procedure-definition" });
                        break;
                    case "tw-macro-definition":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-macro-definition" });
                        break;
                    case "tw-filter-operator":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-filter-operator" });
                        break;
                    case "tw-filter-function":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-filter-function" });
                        break;
                    case "tw-filter-variable":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-filter-variable" });
                        break;
                    case "tw-filter-literal":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-filter-literal" });
                        break;
                    case "tw-filter-subfilter":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-filter-subfilter" });
                        break;
                    case "tw-text":
                        // No decoration needed for plain text
                        return;
                    case "tw-element":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-element" });
                        break;
                    case "tw-unknown":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-unknown" });
                        break;
                    case "tw-generic-node":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-generic-node" });
                        break;
                    case "tw-widget":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-widget" });
                        break;
                    case "tw-transclusion":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-transclusion" });
                        break;
                    case "tw-code":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-code" });
                        break;
                    case "tw-pre":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-pre" });
                        break;
                    case "tw-blockquote":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-blockquote" });
                        break;
                    case "tw-table":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-table" });
                        break;
                    case "tw-table-row":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-table-row" });
                        break;
                    case "tw-table-cell":
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-table-cell" });
                        break;
                    // Add more cases as needed for additional token types
                    default:
                        // Handle any unforeseen token types
                        deco = Dependencies.view.Decoration.mark({ class: "cm-tw-default" });
                        break;
                }
                if (deco && token.start !== null && token.end !== null) {
                    builder.add(token.start, token.end, deco);
                }
            });
            return builder.finish();
        },
        provide: Dependencies.view.decorations.of(function(state) {
            return TiddlyWikiViewPlugin.decorations(state.field(TiddlyWikiViewPlugin));
        })
    });

    /**
     * Defines the custom TW5 language for CodeMirror.
     */
    var TiddlyWikiLanguage = Dependencies.language.LRLanguage.define({
        name: "tiddlywiki",
        // The parser function is handled by the ViewPlugin; no need to define it here
        parser: {
            parse: function(text) {
                // Parsing is managed by the ViewPlugin; return null
                return null;
            }
        },
        // Language configuration including comment styles and auto-closing pairs
        languageData: {
            commentTokens: { line: "//", block: { open: "/*", close: "*/" } },
            autoClosingPairs: [
                { open: "{", close: "}" },
                { open: "[", close: "]" },
                { open: "(", close: ")" },
                { open: '"', close: '"' },
                { open: "'", close: "'" }
            ],
            surroundingPairs: [
                { open: "{", close: "}" },
                { open: "[", close: "]" },
                { open: "(", close: ")" },
                { open: '"', close: '"' },
                { open: "'", close: "'" }
            ]
        }
    });

    // Define Highlight Styles
    var tiddlyWikiHighlightStyle = HighlightStyles.defineHighlightStyles();

    /**
     * Autocompletion function integrating the autocompleter module.
     * @param {Object} context - The autocompletion context from CodeMirror.
     * @returns {Object|null} - The autocompletion options or null.
     */
    function complete(context) {
        return Autocompleter.tiddlyWikiAutocomplete(context);
    }

    // Language Support Bundle using CodeMirrorDependencies
    var TiddlyWikiLanguageSupport = Dependencies.language.LanguageSupport.define([
        TiddlyWikiLanguage,
        Dependencies.language.syntaxHighlighting(tiddlyWikiHighlightStyle),
        Dependencies.autocomplete.autocompletion({
            override: [complete]
        }),
        TiddlyWikiViewPlugin // Integrate the ViewPlugin for decorations
    ]);

    /**
     * Register the Language Support as a CodeMirror extension.
     */
    Dependencies.view.EditorView.defineExtension("tiddlyWikiLanguageSupport", function() {
        return TiddlyWikiLanguageSupport;
    });

    // Export the language support for external use
    exports.TiddlyWikiLanguageSupport = TiddlyWikiLanguageSupport;

})();
