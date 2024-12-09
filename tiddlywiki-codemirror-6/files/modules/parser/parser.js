/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/parser.js
type: application/javascript
module-type: library

Parser module for converting TiddlyWiki content into a parse tree for tokenization.

\*/
(function() {
    "use strict";

    /**
     * Replaces control characters in the text with their escaped equivalents.
     * @param {String} text - The input text to sanitize.
     * @returns {String} - The sanitized text.
     */
    function replaceControlChars(text) {
        return text.replace(/[\r\n]+/g, ' ');
    }

    /**
     * Parses and sanitizes the given text into a parse tree.
     * @param {String} text - The TiddlyWiki content to parse.
     * @returns {Array} - The sanitized parse tree.
     */
    function parseAndSanitize(text) {
        var parsedTree = $tw.wiki.parseText("text/vnd.tiddlywiki", text, null, {}).tree;
        return sanitizeParseTree(parsedTree);
    }

    /**
     * Sanitizes the parse tree by removing unwanted nodes and normalizing it.
     * @param {Array|Object} tree - The raw parse tree.
     * @returns {Array} - The sanitized parse tree.
     */
    function sanitizeParseTree(tree) {
        var sanitized = [];

        function traverse(node) {
            if (Array.isArray(node)) {
                node.forEach(function(child) {
                    traverse(child);
                });
            } else if (typeof node === "object" && node !== null) {
                if (node.type === "comment") return; // Skip comments
                sanitized.push(node);
                if (node.children && Array.isArray(node.children)) {
                    traverse(node.children);
                }
            }
        }

        traverse(tree);
        return sanitized;
    }

    /**
     * Preprocesses the parse tree by adding additional flags or modifying nodes as needed.
     * @param {Array} tree - The sanitized parse tree.
     */
    function preprocessParseTree(tree) {
        tree.forEach(function(node) {
            if (node.type === "set") {
                if (node.isMacroDefinition) {
                    node.isMacroDefinition = true;
                } else if (node.isFunctionDefinition) {
                    node.isFunctionDefinition = true;
                } else if (node.isWidgetDefinition) {
                    node.isWidgetDefinition = true;
                } else if (node.isProcedureDefinition) {
                    node.isProcedureDefinition = true;
                }
            }

            // Recursively preprocess child nodes
            if (node.children && Array.isArray(node.children)) {
                preprocessParseTree(node.children);
            }
        });
    }

    /**
     * Assigns positions to an attribute object.
     * @param {Object} attrObj - The attribute object.
     * @param {String} attr - The attribute key.
     * @param {Number} currentPos - The current character position in the document.
     * @returns {Number} - The updated current position.
     */
    function assignAttributePositions(attrObj, attr, currentPos) {
        if (!attrObj.name) {
            console.warn("Attribute missing 'name'. Assigning default name.");
            attrObj.name = attr || "unknown";
        }
        if (typeof attrObj.value === "undefined") {
            console.warn("Attribute '" + attrObj.name + "' missing 'value'. Assigning empty string.");
            attrObj.value = "";
        }

        attrObj.start = currentPos;
        currentPos += attrObj.name.length + 1; // attr=
        attrObj.valueStart = currentPos + 1; // Opening quote
        currentPos += attrObj.value.length; // Attribute value
        attrObj.valueEnd = attrObj.valueStart + attrObj.value.length;
        attrObj.end = currentPos + 1; // Closing quote
        currentPos += 1;

        return currentPos;
    }

    /**
     * Assigns positions to parameters within parentheses for "set" nodes.
     * @param {Object} node - The node containing parameters.
     * @param {Number} currentPos - The current character position.
     * @returns {Number} - The updated current position.
     */
    function assignParameterPositions(node, currentPos) {
        if (Array.isArray(node.params) && node.params.length > 0) {
            var paramsValue = node.params.join(", "); // Convert array to a comma-separated string
            node.paramsStart = currentPos;
            node.paramsEnd = currentPos + paramsValue.length;
            console.log(
                "Parameters '" + paramsValue + "' assigned start: " + node.paramsStart + ", end: " + node.paramsEnd
            );
            currentPos = node.paramsEnd;
        }
        return currentPos;
    }

    function assignParameterPositions(node, currentPos) {
        if (Array.isArray(node.params)) {
            node.params.forEach(function(param, index) {
                // Assign positions to each parameter
                param.start = currentPos;
                currentPos += param.length; // Assume param.length exists or calculate length dynamically
                param.end = currentPos;

                console.log(`Assigned parameter: ${param} start: ${param.start}, end: ${param.end}`);
            });
        }
        return currentPos;
    }

    /**
     * Accumulates positional information in the parse tree.
     * @param {Array} tree - The sanitized parse tree.
     * @param {Number} baseStart - The base start position.
     */
    function accumulatePositions(tree, baseStart) {
        var currentPos = baseStart;

        function traverse(node) {
            if (Array.isArray(node)) {
                node.forEach(traverse);
            } else if (typeof node === "object" && node !== null) {
                node.start = currentPos;

                if (node.type === "text") {
                    currentPos += node.text.length;
                } else if (node.type === "set") {
                    var defKeyword = node.isMacroDefinition
                        ? "\\define"
                        : node.isFunctionDefinition
                        ? "\\function"
                        : node.isWidgetDefinition
                        ? "\\widget"
                        : node.isProcedureDefinition
                        ? "\\procedure"
                        : "";

                    if (defKeyword) {
                        node.defKeywordStart = currentPos;
                        currentPos += defKeyword.length;
                        node.defKeywordEnd = currentPos;

                        // Handle parameters
                        if (Array.isArray(node.params)) {
                            node.params.forEach(function (param) {
                                param.start = currentPos;
                                var paramValue = param.value || param.name || "";
                                currentPos += paramValue.length;
                                param.end = currentPos;
                            });
                        }

                        // Handle multi-line `value` with `\end`
                        if (node.attributes && node.attributes.value) {
                            var valueAttr = node.attributes.value;
                            valueAttr.start = currentPos;

                            if (valueAttr.value.includes("\\end")) {
                                var lines = valueAttr.value.split("\n");
                                lines.forEach(function (line) {
                                    currentPos += line.length + 1; // Include newline character
                                });
                            } else {
                                currentPos += valueAttr.value.length;
                            }

                            valueAttr.end = currentPos;
                        }
                    }

                    // Traverse children
                    if (node.children && Array.isArray(node.children)) {
                        traverse(node.children);
                    }

                    node.end = currentPos;
                } else if (node.type === "widget" || node.type === "element") {
                    currentPos += node.tag.length + 2; // <$widget> or <element>

                    if (node.attributes) {
                        Object.keys(node.attributes).forEach(function (attr) {
                            currentPos = assignAttributePositions(node.attributes[attr], attr, currentPos);
                        });
                    }

                    if (node.children && Array.isArray(node.children)) {
                        traverse(node.children);
                    }

                    currentPos += node.tag.length + 3; // </$widget> or </element>
                    node.end = currentPos;
                } else {
                    if (node.length) {
                        currentPos += node.length;
                    }
                }

                node.end = currentPos;
            }
        }

        traverse(tree);
    }

    // Export functions for external use
    exports.replaceControlChars = replaceControlChars;
    exports.parseAndSanitize = parseAndSanitize;
    exports.preprocessParseTree = preprocessParseTree;
    exports.accumulatePositions = accumulatePositions;

})();
