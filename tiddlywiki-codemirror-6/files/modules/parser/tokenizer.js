/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/tokenizer.js
type: application/javascript
module-type: library

Tokenizer module for extracting tokens from the parse tree.

\*/
(function() {
    "use strict";

    // Require CodeMirror Dependencies
    var Dependencies = require("$:/plugins/BTC/tiddlywiki-codemirror-6/lib/codemirror-dependencies.js").CodeMirrorDependencies;

    /**
     * Extracts tokens from the parse tree.
     * @param {Array} tree - The parsed syntax tree.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function extractTokens(tree, tokens) {
        if (!tree || !Array.isArray(tree)) return;

        tree.forEach(function(node) {
            switch(node.type) {
                case "element":
                    handleElementNode(node, tokens);
                    break;

                case "text":
                    handleTextNode(node, tokens);
                    break;

                case "link":
                    handleLinkNode(node, tokens);
                    break;

                case "set":
                    handleSetNode(node, tokens);
                    break;

                case "fnprocdef":
                    handleFunctionProcedureNode(node, tokens);
                    break;

                case "procedureDefinition":
                    handleProcedureDefinitionNode(node, tokens);
                    break;

                case "functionDefinition":
                    handleFunctionDefinitionNode(node, tokens);
                    break;

                case "macroDefinition":
                    handleMacroDefinitionNode(node, tokens);
                    break;

                case "image":
                    handleImageNode(node, tokens);
                    break;

                case "video":
                    handleVideoNode(node, tokens);
                    break;

                case "iframe":
                    handleIframeNode(node, tokens);
                    break;

                case "code":
                    handleCodeNode(node, tokens);
                    break;

                case "pre":
                    handlePreNode(node, tokens);
                    break;

                case "blockquote":
                    handleBlockquoteNode(node, tokens);
                    break;

                case "list":
                    handleListNode(node, tokens);
                    break;

                case "listItem":
                    handleListItemNode(node, tokens);
                    break;

                case "heading":
                    handleHeadingNode(node, tokens);
                    break;

                case "paragraph":
                    handleParagraphNode(node, tokens);
                    break;

                case "table":
                    handleTableNode(node, tokens);
                    break;

                case "tableRow":
                    handleTableRowNode(node, tokens);
                    break;

                case "tableCell":
                    handleTableCellNode(node, tokens);
                    break;

                case "widget":
                    handleWidgetNode(node, tokens);
                    break;

                case "transclusion":
                    handleTransclusionNode(node, tokens);
                    break;

                case "definition":
                    handleDefinitionNode(node, tokens);
                    break;

                case "filter":
                    handleFilterNode(node, tokens);
                    break;

                case "unknown":
                    handleUnknownNode(node, tokens);
                    break;

                default:
                    // For any unknown node types, handle them generically
                    handleGenericNode(node, tokens);
                    break;
            }
        });
    }

    /**
     * Handles generic element nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleElementNode(node, tokens) {
        var token = {
            type: "tw-element",
            tag: node.tag || "unknown",
            attributes: {},
            start: node.start,
            end: node.end
        };

        // Assign attributes if present
        if (node.attributes) {
            for (var attr in node.attributes) {
                if (node.attributes.hasOwnProperty(attr)) {
                    token.attributes[attr] = node.attributes[attr].value;
                }
            }
        }

        tokens.push(token);

        // Recursively extract tokens from children
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles text nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleTextNode(node, tokens) {
        var token = {
            type: "tw-text",
            content: node.content || "",
            start: node.start,
            end: node.end
        };
        tokens.push(token);
    }

    /**
     * Handles link nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleLinkNode(node, tokens) {
        var token = {
            type: "tw-link",
            href: node.attributes && node.attributes.href ? node.attributes.href.value : "#",
            title: node.attributes && node.attributes.title ? node.attributes.title.value : "",
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // Extract children (e.g., link text)
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles set nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleSetNode(node, tokens) {
        var token = {
            type: "tw-set",
            key: node.attributes && node.attributes.key ? node.attributes.key.value : "",
            value: node.attributes && node.attributes.value ? node.attributes.value.value : "",
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // Recursively extract tokens from children
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles function and procedure definition nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleFunctionProcedureNode(node, tokens) {
        var token = {
            type: "tw-function-procedure-definition",
            name: node.attributes && node.attributes.name ? node.attributes.name.value : "unknown",
            params: node.attributes && node.attributes.params ? node.attributes.params.value.split(',').map(p => p.trim()) : [],
            isMultiLine: node.isMultiLine || false,
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // Recursively extract tokens from children
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles procedure definition nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleProcedureDefinitionNode(node, tokens) {
        var token = {
            type: "tw-procedure-definition",
            name: node.name || "unknown_procedure",
            params: node.params || [],
            isMultiLine: node.isMultiLine || false,
            start: node.start,
            end: node.end
        };
        tokens.push(token);
    }

    /**
     * Handles function definition nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleFunctionDefinitionNode(node, tokens) {
        var token = {
            type: "tw-function-definition",
            name: node.name || "unknown_function",
            params: node.params || [],
            isMultiLine: node.isMultiLine || false,
            start: node.start,
            end: node.end
        };
        tokens.push(token);
    }

    /**
     * Handles macro definition nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleMacroDefinitionNode(node, tokens) {
        var token = {
            type: "tw-macro-definition",
            name: node.name || "unknown_macro",
            params: node.params || [],
            isMultiLine: node.isMultiLine || false,
            start: node.start,
            end: node.end
        };
        tokens.push(token);
    }

    /**
     * Handles image nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleImageNode(node, tokens) {
        var token = {
            type: "tw-image",
            src: node.attributes && node.attributes.src ? node.attributes.src.value : "",
            alt: node.attributes && node.attributes.alt ? node.attributes.alt.value : "",
            title: node.attributes && node.attributes.title ? node.attributes.title.value : "",
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // Extract children if any (usually none for images)
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles video nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleVideoNode(node, tokens) {
        var token = {
            type: "tw-video",
            src: node.attributes && node.attributes.src ? node.attributes.src.value : "",
            controls: node.attributes && node.attributes.controls ? node.attributes.controls.value : false,
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // Extract source children
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles iframe nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleIframeNode(node, tokens) {
        var token = {
            type: "tw-iframe",
            src: node.attributes && node.attributes.src ? node.attributes.src.value : "",
            title: node.attributes && node.attributes.title ? node.attributes.title.value : "",
            width: node.attributes && node.attributes.width ? node.attributes.width.value : "600",
            height: node.attributes && node.attributes.height ? node.attributes.height.value : "400",
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // Extract children if any (usually none for iframes)
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles code block nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleCodeNode(node, tokens) {
        var token = {
            type: "tw-code",
            language: node.attributes && node.attributes.language ? node.attributes.language.value : "plaintext",
            content: node.content || "",
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // No children expected in code blocks
    }

    /**
     * Handles preformatted text nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handlePreNode(node, tokens) {
        var token = {
            type: "tw-pre",
            content: node.content || "",
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // Extract children if any
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles blockquote nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleBlockquoteNode(node, tokens) {
        var token = {
            type: "tw-blockquote",
            content: node.content || "",
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // Extract children (quoted text)
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles list nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleListNode(node, tokens) {
        var token = {
            type: "tw-list",
            ordered: node.tag === "ol",
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // Extract list items
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles list item nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleListItemNode(node, tokens) {
        var token = {
            type: "tw-list-item",
            content: node.content || "",
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // Extract list item content
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles heading nodes (h1-h6).
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleHeadingNode(node, tokens) {
        var levelMatch = node.tag.match(/^h([1-6])$/);
        var level = levelMatch ? parseInt(levelMatch[1], 10) : 1;

        var token = {
            type: "tw-heading",
            level: level,
            content: node.content || "",
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // Extract children if any
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles paragraph nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleParagraphNode(node, tokens) {
        var token = {
            type: "tw-paragraph",
            content: node.content || "",
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // Extract children (inline elements)
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles table nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleTableNode(node, tokens) {
        var headers = node.attributes && node.attributes.headers ? node.attributes.headers.value.split(',').map(h => h.trim()) : [];

        var token = {
            type: "tw-table",
            headers: headers,
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // Extract table rows
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles table row nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleTableRowNode(node, tokens) {
        var token = {
            type: "tw-table-row",
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // Extract table cells
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles table cell nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleTableCellNode(node, tokens) {
        var isHeader = node.tag === "th";
        var token = {
            type: isHeader ? "tw-table-header-cell" : "tw-table-cell",
            content: node.content || "",
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // Extract cell content
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles widget nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleWidgetNode(node, tokens) {
        var token = {
            type: "tw-widget",
            name: node.attributes && node.attributes.name ? node.attributes.name.value : "unknown_widget",
            params: {},
            start: node.start,
            end: node.end
        };

        // Assign widget parameters
        if (node.attributes) {
            for (var attr in node.attributes) {
                if (node.attributes.hasOwnProperty(attr)) {
                    token.params[attr] = node.attributes[attr].value;
                }
            }
        }

        tokens.push(token);

        // Extract widget content if any
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles transclusion nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleTransclusionNode(node, tokens) {
        var token = {
            type: "tw-transclusion",
            title: node.attributes && node.attributes.title ? node.attributes.title.value : "unknown_tiddler",
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // Extract transcluded content if any
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles definition nodes (\procedure, \function, \define).
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleDefinitionNode(node, tokens) {
        var token = {
            type: "tw-definition",
            kind: node.kind || "unknown_definition",
            name: node.name || "unknown_name",
            params: node.params || [],
            isMultiLine: node.isMultiLine || false,
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // Extract definition content if any
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles filter expression nodes.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleFilterNode(node, tokens) {
        var token = {
            type: "tw-filter",
            expression: node.expression || "",
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // Extract filter components if any
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles unknown or custom node types.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleUnknownNode(node, tokens) {
        var token = {
            type: "tw-unknown",
            content: node.content || "",
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // Attempt to extract any children if present
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Handles all other node types not explicitly defined.
     * @param {Object} node - The syntax tree node.
     * @param {Array} tokens - The array to accumulate tokens.
     */
    function handleGenericNode(node, tokens) {
        var token = {
            type: "tw-generic-node",
            tag: node.tag || "unknown_tag",
            content: node.content || "",
            start: node.start,
            end: node.end
        };
        tokens.push(token);

        // Extract children if any
        if (node.children && node.children.length > 0) {
            extractTokens(node.children, tokens);
        }
    }

    /**
     * Export the extractTokens function.
     * This function ensures all node types are handled appropriately.
     */
    exports.extractTokens = extractTokens;

})();
