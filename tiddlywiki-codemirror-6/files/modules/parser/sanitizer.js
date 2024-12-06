/*\
title: $:/plugins/BTC/tiddlywiki-codemirror-6/modules/parser/sanitizer.js
type: application/javascript
module-type: library

sanitize functions

\*/

(function(){

var DOMPurify = require("$:/plugins/BTC/tiddlywiki-codemirror-6/lib/dompurify.js");

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * @param {String} dirty - The unsanitized HTML string.
 * @returns {String} - The sanitized HTML string.
 */
function sanitizeHTML(dirty) {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true }, // Use default HTML sanitizer
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br',
      'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre',
      'img', 'figure', 'figcaption', 'video', 'source', 'iframe'
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'target', 'alt', 'src', 'class', 'style',
      'width', 'height', 'frameborder', 'allow', 'allowfullscreen'
    ]
  });
}

/**
 * Sanitizes CSS styles to prevent injection of malicious styles.
 * @param {String} dirtyCSS - The unsanitized CSS string.
 * @returns {String} - The sanitized CSS string.
 */
function sanitizeCSS(dirtyCSS) {
  // Remove 'expression', 'javascript:', and other potentially harmful patterns
  return dirtyCSS
    .replace(/expression\s*\(.*?\)/gi, '')
    .replace(/url\s*\(\s*['"]?javascript:.*?['"]?\s*\)/gi, '')
    .replace(/behavior\s*:/gi, '');
}

/**
 * Sanitizes attribute values based on attribute type.
 * @param {String} name - The attribute name.
 * @param {String} value - The attribute value.
 * @returns {String} - The sanitized attribute value.
 */
function sanitizeAttribute(name, value) {
  // Prevent javascript: URIs
  if (['href', 'src'].indexOf(name.toLowerCase()) !== -1) {
    if (/^javascript:/i.test(value)) {
      return '#';
    }
  }

  // Remove script tags and event handlers
  var sanitizedValue = value.replace(/<script.*?>.*?<\/script>/gi, '')
                            .replace(/on\w+=".*?"/gi, '');

  // Further sanitize using DOMPurify if needed
  sanitizedValue = sanitizeHTML(sanitizedValue);

  return sanitizedValue;
}

// Export the functions
exports.sanitizer = {
  sanitizeHTML: sanitizeHTML,
  sanitizeCSS: sanitizeCSS,
  sanitizeAttribute: sanitizeAttribute,
};

})();
