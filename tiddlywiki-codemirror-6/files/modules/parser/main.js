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
    var defineHighlightStyles = require("$:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/highlight-styles.js").defineHighlightStyles;

    /**
     * ViewPlugin to apply syntax highlighting based on tokens.
     * This plugin scans the document for tokens and applies Decorations accordingly.
     */
    var TiddlyWikiViewPlugin = Dependencies.view.ViewPlugin.define(
        // 1. Create Function: Initializes plugin state
        function(view) {
            console.log("TiddlyWikiViewPlugin: create called with view:", view);

            // Initialize plugin state with an empty token list
            return {
                tokens: [],

                /**
                 * Update Method: Handles state updates.
                 * Parses the document for tokens and updates the plugin's state.
                 */
                update: function(update) {
                    console.log("TiddlyWikiViewPlugin: update called.");
                    if (update.docChanged) {
                        console.log("TiddlyWikiViewPlugin: Document changed.");
                        try {
                            // Retrieve the updated document text
                            var text = update.state.doc.toString();
                            console.log("TiddlyWikiViewPlugin: Document text:", text);

                            // Sanitize the text by replacing control characters
                            var sanitizedText = Parser.replaceControlChars(text);
                            console.log("TiddlyWikiViewPlugin: Sanitized text:", sanitizedText);

                            // Parse and sanitize the text into a parse tree
                            var parsedTree = Parser.parseAndSanitize(sanitizedText);
                            console.log("TiddlyWikiViewPlugin: Parsed Tree:", parsedTree);

                            // Preprocess the parse tree (e.g., handling macros, widgets)
                            Parser.preprocessParseTree(parsedTree);
                            console.log("TiddlyWikiViewPlugin: Preprocessed Tree:", parsedTree);

                            // Accumulate positional information in the parse tree
                            Parser.accumulatePositions(parsedTree, 0);
                            console.log("TiddlyWikiViewPlugin: Tree after accumulatePositions:", parsedTree);

                            // Extract tokens from the parse tree
                            var tokens = [];
                            Tokenizer.extractTokens(parsedTree, tokens);
                            console.log("TiddlyWikiViewPlugin: Extracted Tokens:", tokens);

                            // Filter out undefined or null tokens
                            this.tokens = tokens.filter(function(token) {
                                return token !== undefined && token !== null;
                            });

                            console.log("TiddlyWikiViewPlugin: Updated Tokens:", this.tokens);
                        } catch (e) {
                            console.error("TiddlyWikiViewPlugin: Error during update:", e);
                            // Optionally, handle the error (e.g., deactivate the plugin or notify the user)
                        }
                    }
                },
            };
        },
        // 2. Spec Object: Contains decorations method
        {
            /**
             * Decorations Method: Generates decorations based on tokens.
             * Iterates over the tokens and applies appropriate CSS classes.
             */
            decorations: function(pluginValue) {
                console.log("TiddlyWikiViewPlugin: decorations called with tokens:", pluginValue.tokens);
                var builder = new Dependencies.state.RangeSetBuilder();
                var tokens = pluginValue.tokens;

                // Sort tokens by `start` position to ensure correct rendering order
                tokens.sort(function(a, b) {
                    return a.start - b.start || (a.startSide || 0) - (b.startSide || 0);
                });

                tokens.forEach(function(token) {
                    console.log("TiddlyWikiViewPlugin: Processing token:", token);
                    var deco;

                    if (token.type) {
                        // Determine the CSS class based on token type
                        switch (token.type) {
                            case "tw-button-widget":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-button-widget" });
                                break;
                            case "tw-list-widget":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-list-widget" });
                                break;
                            case "tw-image-widget":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-image-widget" });
                                break;
                            case "tw-input-widget":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-input-widget" });
                                break;
                            case "tw-output-widget":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-output-widget" });
                                break;
                            case "tw-select-widget":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-select-widget" });
                                break;
                            case "tw-textarea-widget":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-textarea-widget" });
                                break;
                            case "tw-tiddler-widget":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-tiddler-widget" });
                                break;
                            case "tw-table-widget":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-table-widget" });
                                break;
                            case "tw-code-widget":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-code-widget" });
                                break;
                            case "tw-pre-widget":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-pre-widget" });
                                break;
                            case "tw-blockquote-widget":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-blockquote-widget" });
                                break;
                            case "tw-macro-widget":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-macro-widget" });
                                break;
                            case "tw-definition-keyword":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-definition-keyword" });
                                break;
                            case "tw-definition-name":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-definition-name" });
                                break;
                            case "tw-definition-params":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-definition-params" });
                                break;
                            case "tw-definition-value":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-definition-value" });
                                break;
                            case "tw-filter-operator":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-filter-operator" });
                                break;
                            case "tw-filter-tiddler":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-filter-tiddler" });
                                break;
                            case "tw-filter-string":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-filter-string" });
                                break;
                            case "tw-filter-keyword":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-filter-keyword" });
                                break;
                            case "tw-filter-number":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-filter-number" });
                                break;
                            case "tw-filter-variable":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-filter-variable" });
                                break;
                            case "tw-attribute-name":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-attribute-name" });
                                break;
                            case "tw-attribute-value":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-attribute-value" });
                                break;
                            case "tw-text":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-text" });
                                break;
                            case "tw-element":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-element" });
                                break;
                            case "tw-generic-widget":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-generic-widget" });
                                break;
                            case "tw-function-widget":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-function-widget" });
                                break;
                            case "tw-procedure-widget":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-procedure-widget" });
                                break;
                            case "tw-widget-widget":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-widget-widget" });
                                break;
                            case "tw-heading-element":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-heading-element" });
                                break;
                            // Add additional cases for new token types as needed
                            default:
                                // Handle any unforeseen token types with a default style
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-default" });
                                break;
                        }
                    } else if (token.tag) {
                        // Handle tokens based on tag if applicable
                        switch(token.tag) {
                            case "$list":
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-list-widget" });
                                break;
                            // Add additional tag-based cases as needed
                            default:
                                deco = Dependencies.view.Decoration.mark({ class: "cm-tw-default" });
                                break;
                        }
                    }

                    // Validate token positions before adding decoration
                    if (deco && typeof token.start === "number" && typeof token.end === "number") {
                        if (token.start < token.end) {
                            builder.add(token.start, token.end, deco);
                            console.log("TiddlyWikiViewPlugin: Added decoration from " + token.start + " to " + token.end);
                        } else {
                            console.warn("TiddlyWikiViewPlugin: Token start is greater than or equal to end:", token);
                        }
                    } else {
                        console.warn("TiddlyWikiViewPlugin: Invalid token positions:", token);
                    }
                });

                var decorationSet = builder.finish();
                console.log("TiddlyWikiViewPlugin: Generated DecorationSet:", decorationSet);

                // Fallback to DecorationSet.none if decorationSet is undefined or empty
                if (!decorationSet || decorationSet.size === 0) {
                    console.warn("TiddlyWikiViewPlugin: DecorationSet is undefined or empty. Using DecorationSet.none.");
                    decorationSet = Dependencies.state.RangeSet.of([]);
                }

                return decorationSet;
            }
        }
    );

    /**
     * Define Highlight Styles
     * Generates the highlight styles using the HighlightStyles module.
     */
    var tiddlyWikiHighlightStyle = defineHighlightStyles();

    /**
     * Autocompletion Function
     * Integrates the Autocompleter module with CodeMirror's autocompletion.
     * @param {Object} context - The autocompletion context from CodeMirror.
     * @returns {Object|null} - The autocompletion options or null.
     */
    function complete(context) {
        return Autocompleter.tiddlyWikiAutocomplete(context);
    }

    var TiddlyWikiHighlightPlugin = Dependencies.language.syntaxHighlighting(tiddlyWikiHighlightStyle);
    var TiddlyWikiAutocompletePlugin = Dependencies.autocomplete.autocompletion({ override: [complete] });

    /**
     * Export the plugins for external use.
     */
    exports.TiddlyWikiViewPlugin = TiddlyWikiViewPlugin;
    exports.TiddlyWikiHighlightPlugin = TiddlyWikiHighlightPlugin;
    exports.TiddlyWikiAutocompletePlugin = TiddlyWikiAutocompletePlugin;

})();
