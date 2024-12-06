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
    var TiddlyWikiViewPlugin = Dependencies.view.ViewPlugin.define(
        function(view) {
            // Initialize the plugin value
            return {
                tokens: [],
                view: view,

                // Update function to handle document changes
                update: function(tr) {
                    console.log("Update called with transaction:", tr);
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
                                type: "tw-" + def.type,
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
                                    var filterRegex = /\[([^\]]+)\]/g;
                                    var match;
                                    while ((match = filterRegex.exec(token.value)) !== null) {
                                        var filterText = match[1];
                                        Parser.parseAndTokenizeFilter(filterText, tokens);
                                    }
                                }
                            }
                        });

                        // Update tokens in the plugin state
                        this.tokens = tokens;
                    }
                },

                // Generate decorations based on tokens
                getDecorations: function() {
                    var builder = new Dependencies.view.RangeSetBuilder();
                    var tokens = this.tokens;

                    tokens.forEach(function(token) {
                        var deco;
                        switch (token.type) {
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
                }
            };
        },
        {
            // Provide the decorations as a facet
            provide: function(plugin) {
                return Dependencies.view.decorations.from(plugin, function(value) {
                    return value.getDecorations ? value.getDecorations() : Dependencies.view.Decoration.none;
                });
            }
        }
    );

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

    /**
     * Language Support Bundle using CodeMirrorDependencies
     * Note: We are not using LanguageSupport.define() or LRLanguage.define()
     * Instead, we manually bundle the extensions.
     */
    var TiddlyWikiLanguageSupport = new Dependencies.language.LanguageSupport([
        Dependencies.language.syntaxHighlighting(tiddlyWikiHighlightStyle),
        Dependencies.autocomplete.autocompletion({
            override: [complete]
        })
    ]);

    // Export the language support for external use
    exports.TiddlyWikiLanguageSupport = TiddlyWikiLanguageSupport;
    exports.TiddlyWikiViewPlugin = TiddlyWikiViewPlugin;

})();
