/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/parser.js
type: application/javascript
module-type: library

Parser module for processing TW5 text and extracting definitions, filters, widgets, transclusions, media elements, and more.

\*/
(function() {
    "use strict";

    // Require necessary modules
    var Tokenizer = require("$:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/tokenizer.js");
    var Sanitizer = require("$:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/sanitizer.js");
    var Dependencies = require("$:/plugins/BTC/tiddlywiki-codemirror-6/lib/codemirror-dependencies.js").CodeMirrorDependencies;

    /**
     * Parses and sanitizes the input text.
     * @param {String} text - The raw TW5 text.
     * @returns {Array} - The sanitized and parsed syntax tree.
     */
    function parseAndSanitize(text) {
        var sanitizedText = replaceControlChars(text);
        // Parse the sanitized text into a syntax tree
        // The second parameter can include parsing options; adjust as needed
        return $tw.wiki.parseText(sanitizedText, { parseAsInline: false });
    }

    /**
     * Replaces control characters like \n and \t with spaces.
     * @param {String} text - The input text.
     * @returns {String} - The text with control characters replaced.
     */
    function replaceControlChars(text) {
        return text.replace(/\\n/g, ' ').replace(/\\t/g, ' ');
    }

    /**
     * Accumulates start and end positions for nested nodes.
     * This ensures that child nodes have their positions relative to the entire document.
     * @param {Array} tree - The syntax tree.
     * @param {Number} parentStart - The starting position of the parent node.
     */
    function accumulatePositions(tree, parentStart) {
        if (!tree || typeof parentStart !== "number") return;
        tree.forEach(function(node) {
            node.start += parentStart;
            node.end += parentStart;
            if (node.children && node.children.length > 0) {
                accumulatePositions(node.children, node.start);
            }
        });
    }

    /**
     * Parses filter expressions and extracts tokens.
     * @param {String} filterText - The filter expression.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function parseAndTokenizeFilter(filterText, tokens) {
        var sanitizedFilter = Sanitizer.sanitizer.sanitizeHTML(filterText);
        var parsedFilter;
        try {
            parsedFilter = $tw.utils.parseFilter(sanitizedFilter); // Direct usage of parseFilter()
        } catch(e) {
            console.error("Filter parsing error:", e);
            tokens.push({
                type: "tw-filter-error",
                value: e.toString(),
                start: null,
                end: null
            });
            return;
        }
        extractFilterTokens(parsedFilter, tokens);
    }

    /**
     * Extracts tokens from the filter parse tree.
     * @param {Array} filterParseTree - The parsed filter operations.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function extractFilterTokens(filterParseTree, tokens) {
        if (!filterParseTree) return;

        /**
         * Traverses the filter parse tree recursively to extract tokens.
         * @param {Object} node - The current node in the filter parse tree.
         */
        function traverse(node) {
            if (!node) return;

            switch(node.type) {
                case "operator":
                    tokens.push({
                        type: "tw-filter-operator",
                        value: node.name,
                        start: node.start,
                        end: node.end
                    });
                    break;

                case "function":
                    tokens.push({
                        type: "tw-filter-function",
                        value: node.name,
                        start: node.start,
                        end: node.end
                    });
                    // Traverse arguments
                    if (node.args && node.args.length > 0) {
                        node.args.forEach(function(arg) {
                            traverse(arg);
                        });
                    }
                    break;

                case "variable":
                    tokens.push({
                        type: "tw-filter-variable",
                        value: node.name,
                        start: node.start,
                        end: node.end
                    });
                    break;

                case "literal":
                    tokens.push({
                        type: "tw-filter-literal",
                        value: node.value,
                        start: node.start,
                        end: node.end
                    });
                    break;

                case "subfilter":
                    tokens.push({
                        type: "tw-filter-subfilter",
                        value: node.filter,
                        start: node.start,
                        end: node.end
                    });
                    // Recursively traverse the subfilter
                    if (node.filter && node.filter.length > 0) {
                        node.filter.forEach(function(subNode) {
                            traverse(subNode);
                        });
                    }
                    break;

                case "boolean":
                    tokens.push({
                        type: "tw-filter-boolean",
                        value: node.value,
                        start: node.start,
                        end: node.end
                    });
                    break;

                case "number":
                    tokens.push({
                        type: "tw-filter-number",
                        value: node.value,
                        start: node.start,
                        end: node.end
                    });
                    break;

                case "string":
                    tokens.push({
                        type: "tw-filter-string",
                        value: node.value,
                        start: node.start,
                        end: node.end
                    });
                    break;

                case "regex":
                    tokens.push({
                        type: "tw-filter-regex",
                        value: node.value,
                        start: node.start,
                        end: node.end
                    });
                    break;

                case "pipe":
                    tokens.push({
                        type: "tw-filter-pipe",
                        value: "|",
                        start: node.start,
                        end: node.end
                    });
                    break;

                case "bang":
                    tokens.push({
                        type: "tw-filter-bang",
                        value: "!",
                        start: node.start,
                        end: node.end
                    });
                    break;

                case "parenthesis":
                    tokens.push({
                        type: "tw-filter-parenthesis",
                        value: node.value,
                        start: node.start,
                        end: node.end
                    });
                    break;

                default:
                    console.warn("Unhandled filter node type:", node.type);
                    break;
            }
        }

        // Start traversing from the root of the filter parse tree
        filterParseTree.forEach(function(node) {
            traverse(node);
        });
    }

    /**
     * Parses definitions such as procedures, functions, and macros.
     * It handles both single-line and multi-line definitions.
     * @param {String} text - The input TW5 text.
     * @returns {Array} - An array of definition objects.
     */
    function parseDefinitions(text) {
        let lines = text.split('\n');
        let definitions = [];
        let currentDef = null;

        lines.forEach(function(line, index) {
            let procedureMatch = line.match(/^\\procedure\s+(\w+)\(([^)]*)\)/);
            let functionMatch = line.match(/^\\function\s+(\w+)\(([^)]*)\)/);
            let macroMatch = line.match(/^\\define\s+(\w+)\(([^)]*)\)/);
            let endMatch = line.match(/^\\end/);

            if (procedureMatch || functionMatch || macroMatch) {
                if (currentDef) {
                    // Handle nested definitions or log a warning
                    console.warn("Nested definitions are not supported.");
                    return;
                }
                currentDef = {
                    type: procedureMatch ? 'procedureDefinition' :
                          functionMatch ? 'functionDefinition' :
                          'macroDefinition',
                    name: procedureMatch ? procedureMatch[1] :
                          functionMatch ? functionMatch[1] :
                          macroMatch[1],
                    params: procedureMatch ? procedureMatch[2].split(',').map(p => p.trim()) :
                            functionMatch ? functionMatch[2].split(',').map(p => p.trim()) :
                            macroMatch[2].split(',').map(p => p.trim()),
                    content: '',
                    start: index,
                    end: null,
                    isMultiLine: false
                };
            } else if (endMatch && currentDef) {
                currentDef.end = index;
                currentDef.isMultiLine = true;
                definitions.push(currentDef);
                currentDef = null;
            } else if (currentDef) {
                currentDef.content += line + '\n';
            }
        });

        // Handle single-line definitions (without \end)
        lines.forEach(function(line, index) {
            let singleLineProcedureMatch = line.match(/^\\procedure\s+(\w+)\(([^)]*)\)$/);
            let singleLineFunctionMatch = line.match(/^\\function\s+(\w+)\(([^)]*)\)$/);
            let singleLineMacroMatch = line.match(/^\\define\s+(\w+)\(([^)]*)\)$/);

            if (singleLineProcedureMatch || singleLineFunctionMatch || singleLineMacroMatch) {
                definitions.push({
                    type: singleLineProcedureMatch ? 'procedureDefinition' :
                          singleLineFunctionMatch ? 'functionDefinition' :
                          singleLineMacroMatch ? 'macroDefinition' : null,
                    name: singleLineProcedureMatch ? singleLineProcedureMatch[1] :
                          singleLineFunctionMatch ? singleLineFunctionMatch[1] :
                          singleLineMacroMatch ? singleLineMacroMatch[1] : null,
                    params: singleLineProcedureMatch ? singleLineProcedureMatch[2].split(',').map(p => p.trim()) :
                            singleLineFunctionMatch ? singleLineFunctionMatch[2].split(',').map(p => p.trim()) :
                            singleLineMacroMatch ? singleLineMacroMatch[2].split(',').map(p => p.trim()) : [],
                    content: '',
                    start: index,
                    end: index,
                    isMultiLine: false
                });
            }
        });

        return definitions;
    }

    /**
     * Extracts widgets from the parse tree.
     * @param {Array} parseTree - The syntax tree.
     * @returns {Array} - An array of widget objects.
     */
    function extractWidgets(parseTree) {
        var widgets = [];

        /**
         * Traverses the parse tree to find widget nodes.
         * @param {Object} node - The current node in the syntax tree.
         */
        function traverse(node) {
            if (!node) return;

            if (node.type === "widget") {
                widgets.push({
                    name: node.widgetName || "unknown_widget",
                    params: node.attributes || {},
                    start: node.start,
                    end: node.end
                });
            }

            if (node.children && node.children.length > 0) {
                node.children.forEach(function(child) {
                    traverse(child);
                });
            }
        }

        parseTree.forEach(function(node) {
            traverse(node);
        });

        return widgets;
    }

    /**
     * Extracts transclusions from the parse tree.
     * @param {Array} parseTree - The syntax tree.
     * @returns {Array} - An array of transclusion objects.
     */
    function extractTransclusions(parseTree) {
        var transclusions = [];

        /**
         * Traverses the parse tree to find transclusion nodes.
         * @param {Object} node - The current node in the syntax tree.
         */
        function traverse(node) {
            if (!node) return;

            if (node.type === "transclusion") {
                transclusions.push({
                    title: node.title || "unknown_tiddler",
                    start: node.start,
                    end: node.end
                });
            }

            if (node.children && node.children.length > 0) {
                node.children.forEach(function(child) {
                    traverse(child);
                });
            }
        }

        parseTree.forEach(function(node) {
            traverse(node);
        });

        return transclusions;
    }

    /**
     * Extracts media elements (images, videos, iframes) from the parse tree.
     * @param {Array} parseTree - The syntax tree.
     * @returns {Array} - An array of media element objects.
     */
    function extractMediaElements(parseTree) {
        var mediaElements = [];

        /**
         * Traverses the parse tree to find media nodes.
         * @param {Object} node - The current node in the syntax tree.
         */
        function traverse(node) {
            if (!node) return;

            if (node.type === "image" || node.type === "video" || node.type === "iframe") {
                mediaElements.push({
                    type: node.type,
                    src: node.attributes && node.attributes.src ? node.attributes.src.value : "",
                    alt: node.attributes && node.attributes.alt ? node.attributes.alt.value : "",
                    title: node.attributes && node.attributes.title ? node.attributes.title.value : "",
                    start: node.start,
                    end: node.end
                });
            }

            if (node.children && node.children.length > 0) {
                node.children.forEach(function(child) {
                    traverse(child);
                });
            }
        }

        parseTree.forEach(function(node) {
            traverse(node);
        });

        return mediaElements;
    }

    /**
     * Extracts all relevant information from the parse tree.
     * This function serves as a bridge between parsing and tokenization.
     * @param {Array} parseTree - The syntax tree generated by $tw.wiki.parseText().
     * @returns {Object} - An object containing tokens, definitions, filters, widgets, transclusions, media elements, etc.
     */
    function extractAllInfo(parseTree) {
        var tokens = [];
        var definitions = [];
        var filters = [];
        var widgets = [];
        var transclusions = [];
        var mediaElements = [];

        // Extract tokens using the tokenizer
        Tokenizer.extractTokens(parseTree, tokens);

        // Parse definitions
        definitions = parseDefinitions($tw.utils.stringifyTree(parseTree));

        // Extract widgets
        widgets = extractWidgets(parseTree);

        // Extract transclusions
        transclusions = extractTransclusions(parseTree);

        // Extract media elements
        mediaElements = extractMediaElements(parseTree);

        // Extract filters from tokens
        tokens.forEach(function(token) {
            if (token.type === "tw-set" || token.type === "tw-function-definition" || token.type === "tw-element") {
                if (token.value && typeof token.value === "string") {
                    // Detect if the value contains a filter
                    // TW5 filters are typically enclosed in square brackets []
                    var filterRegex = /\[([^\]]+)\]/g;
                    var match;
                    while ((match = filterRegex.exec(token.value)) !== null) {
                        var filterText = match[1];
                        parseAndTokenizeFilter(filterText, tokens);
                    }
                }
            }
        });

        // Extract filters from tokens after processing
        filters = tokens.filter(token => token.type.startsWith("tw-filter"));

        return {
            tokens: tokens,
            definitions: definitions,
            filters: filters,
            widgets: widgets,
            transclusions: transclusions,
            mediaElements: mediaElements
        };
    }

    // Export parser functions
    exports.parseAndSanitize = parseAndSanitize;
    exports.replaceControlChars = replaceControlChars;
    exports.accumulatePositions = accumulatePositions;
    exports.parseAndTokenizeFilter = parseAndTokenizeFilter;
    exports.extractFilterTokens = extractFilterTokens;
    exports.parseDefinitions = parseDefinitions;
    exports.extractWidgets = extractWidgets;
    exports.extractTransclusions = extractTransclusions;
    exports.extractMediaElements = extractMediaElements;
    exports.extractAllInfo = extractAllInfo;

})();
