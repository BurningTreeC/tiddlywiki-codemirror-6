/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/tokenizer.js
type: application/javascript
module-type: library

Tokenizer module for extracting tokens from the preprocessed parse tree, including handling "set" nodes for function definitions and parameters enclosed by ().

\*/
(function() {
    "use strict";

    // Require necessary modules
    var Parser = require("$:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/parser.js");
    var widgetMap = require("$:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/widgetTagMap.js").widgetTagMap;
    var elementMap = require("$:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/elementTagMap.js").elementTagMap;
    var tokenizerConfig = require("$:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/tokenizerConfig.js");

    /**
     * Extracts tokens from the parse tree.
     * @param {Array} tree - The preprocessed parse tree.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function extractTokens(tree, tokens) {
        if (!tree || !Array.isArray(tree)) return;

        tree.forEach(function(node) {
            if (isSetNode(node)) {
                handleSetNode(node, tokens);
            } else if (isWidgetNode(node)) {
                handleWidgetNode(node, tokens);
            } else if (isElementNode(node)) {
                handleElementNode(node, tokens);
            } else if (node.type === "text") {
                handleTextNode(node, tokens);
            } else if (node.type === "list") {
                handleListNode(node, tokens);
            }
        });
    }

    /**
     * Determines if a node is a "set" node (e.g., function or procedure definitions).
     * @param {Object} node - The node to check.
     * @returns {Boolean} - True if the node is a "set" node, else false.
     */
    function isSetNode(node) {
        return node && node.type === "set";
    }

    /**
     * Determines if a node is a widget node.
     * @param {Object} node - The node to check.
     * @returns {Boolean} - True if the node is a widget, else false.
     */
    function isWidgetNode(node) {
        return node && node.type === "widget";
    }

    /**
     * Determines if a node is an element node.
     * @param {Object} node - The node to check.
     * @returns {Boolean} - True if the node is an element, else false.
     */
    function isElementNode(node) {
        return node && node.type === "element";
    }

    /**
     * Handles "set" nodes by creating tokens based on the definition type and parameters.
     * @param {Object} node - The "set" node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleSetNode(node, tokens) {
        if (node.isFunctionDefinition || node.isProcedureDefinition || node.isMacroDefinition || node.isWidgetDefinition) {
            // Create a token for the definition keyword
            var keywordToken = {
                type: "tw-definition-keyword",
                value: node.isFunctionDefinition
                    ? "\\function"
                    : node.isProcedureDefinition
                    ? "\\procedure"
                    : node.isMacroDefinition
                    ? "\\define"
                    : "\\widget",
                start: node.defKeywordStart,
                end: node.defKeywordEnd
            };
            tokens.push(keywordToken);

            // Create tokens for parameters
            if (Array.isArray(node.params)) {
                node.params.forEach(function (param) {
                    var paramToken = {
                        type: "tw-definition-param",
                        value: param.name || "",
                        start: param.start,
                        end: param.end
                    };
                    tokens.push(paramToken);
                });
            }

            // Create a token for the value
            if (node.attributes && node.attributes.value) {
                var valueAttr = node.attributes.value;
                var valueToken = {
                    type: "tw-definition-value",
                    value: valueAttr.value,
                    start: valueAttr.start,
                    end: valueAttr.end
                };
                tokens.push(valueToken);

                // Add a token for the `\end` if present
                if (valueAttr.value.includes("\\end")) {
                    var endIndex = valueAttr.value.lastIndexOf("\\end");
                    var endToken = {
                        type: "tw-definition-end",
                        value: "\\end",
                        start: valueAttr.start + endIndex,
                        end: valueAttr.start + endIndex + "\\end".length
                    };
                    tokens.push(endToken);
                }
            }
        }

        // Process child nodes
        if (node.children && Array.isArray(node.children)) {
            extractTokens(node.children, tokens);
        }
    }

    function tokenizeString(value, startIndex, tokens, type) {
        var currentPos = startIndex;

        // Tokenize each part of the string
        value.split(/(\s+|[\[\](){}])/g).forEach(function(part) {
            if (part.trim().length > 0) {
                tokens.push({
                    type: type,
                    value: part,
                    start: currentPos,
                    end: currentPos + part.length
                });
            }
            currentPos += part.length;
        });
    }

    /**
     * Handles widget nodes by creating tokens based on widget type and attributes.
     * @param {Object} node - The widget node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleWidgetNode(node, tokens) {
        var widgetType = widgetMap[node.tag.toLowerCase()] || "tw-generic-widget";

        // Token for the widget itself
        tokens.push({
            type: widgetType,
            tag: node.tag,
            start: node.start,
            end: node.end
        });

        // Tokenize attributes
        processAttributes(node, tokens);

        // Token for parameters if present
        if (node.params && node.params.length > 0) {
            tokens.push({
                type: "tw-definition-params",
                value: node.params,
                start: node.paramsStart,
                end: node.paramsEnd
            });
        }

        // Recursively process child nodes
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles element nodes by creating tokens based on element type and attributes.
     * @param {Object} node - The element node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleElementNode(node, tokens) {
        // Tokenize the opening tag
        tokens.push({
            type: "tw-element-open",
            value: `<${node.tag}>`,
            start: node.start,
            end: node.start + node.tag.length + 2 // Include < and >
        });

        // Tokenize attributes
        if (node.attributes) {
            Object.keys(node.attributes).forEach(function(attr) {
                var attrObj = node.attributes[attr];

                // Tokenize the attribute name
                tokens.push({
                    type: "tw-attribute-name",
                    value: attrObj.name,
                    start: attrObj.start,
                    end: attrObj.start + attrObj.name.length
                });

                // Tokenize the attribute value
                if (attrObj.value) {
                    tokenizeString(attrObj.value, attrObj.valueStart, tokens, "tw-attribute-value");
                }
            });
        }

        // Recursively tokenize children
        if (node.children && Array.isArray(node.children)) {
            extractTokens(node.children, tokens);
        }

        // Tokenize the closing tag
        tokens.push({
            type: "tw-element-close",
            value: `</${node.tag}>`,
            start: node.end - node.tag.length - 3, // Include </ and >
            end: node.end
        });
    }

    /**
     * Processes attributes of a node, creating tokens for attribute names and values.
     * @param {Object} node - The node with attributes.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function processAttributes(node, tokens) {
        if (!node.attributes || typeof node.attributes !== "object") return;

        Object.keys(node.attributes).forEach(function(attrName) {
            var attr = node.attributes[attrName];

            // Token for the attribute name
            tokens.push({
                type: "tw-attribute-name",
                name: attrName,
                start: attr.start,
                end: attr.end
            });

            // Token for the attribute value
            tokens.push({
                type: "tw-attribute-value",
                value: attr.value,
                start: attr.valueStart,
                end: attr.valueEnd
            });
        });
    }

    /**
     * Logs messages to the console if debugging is enabled.
     * @param {String} message - The message to log.
     */
    function log(message) {
        if (DEBUG) {
            console.log(message);
        }
    }

    var DEBUG = true; // Enable or disable debug logging

    // Export the extractTokens function
    exports.extractTokens = extractTokens;

})();
