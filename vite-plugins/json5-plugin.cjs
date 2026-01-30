/**
 * Vite plugin to support importing .json5 files
 * 
 * This plugin allows importing JSON5 files (JSON with comments and trailing commas)
 * and converts them to standard JSON during the build process.
 */

const fs = require('fs');
const JSON5 = require('json5');

/**
 * Creates a Vite plugin that handles .json5 file imports
 * @returns {import('vite').Plugin}
 */
function json5Plugin() {
  return {
    name: 'vite-plugin-json5',
    
    /**
     * Transform .json5 files to JavaScript modules
     */
    transform(code, id) {
      // Only process .json5 files
      if (!id.endsWith('.json5')) {
        return null;
      }

      try {
        // Parse JSON5 and convert to standard JSON
        const parsed = JSON5.parse(code);
        
        // Export as ES module
        return {
          code: `export default ${JSON.stringify(parsed, null, 2)}`,
          map: null,
        };
      } catch (error) {
        this.error(`Failed to parse JSON5 file: ${id}\n${error.message}`);
      }
    },
    
    /**
     * Handle hot module replacement for .json5 files
     */
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.json5')) {
        // Trigger full reload when .json5 files change
        server.ws.send({
          type: 'full-reload',
          path: '*',
        });
      }
    },
  };
}

module.exports = json5Plugin;
