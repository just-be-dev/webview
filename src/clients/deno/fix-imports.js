#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'glob';

/**
 * Post-build script to add .js extensions to local imports in compiled JavaScript files
 * This allows extensionless imports in TypeScript source while generating Node.js-compatible output
 */

async function fixImports() {
  // Find all JavaScript files
  const jsFiles = await glob('**/*.js', { 
    ignore: ['node_modules/**', 'fix-imports.js'] 
  });

  for (const file of jsFiles) {
    let content = readFileSync(file, 'utf8');
    let modified = false;

    // Fix relative imports without extensions (add .js)
    // Matches: import ... from "./something" or "../something"
    // Doesn't match: import ... from "package-name" or "./something.js"
    content = content.replace(
      /import\s+([^'"]*)\s+from\s+['"](\.[^'"]*?)['"];?/g,
      (match, imports, path) => {
        // Only add .js if the path doesn't already have an extension
        if (!path.match(/\.[a-zA-Z0-9]+$/)) {
          modified = true;
          return `import ${imports} from '${path}.js';`;
        }
        return match;
      }
    );

    // Fix export ... from statements
    content = content.replace(
      /export\s+([^'"]*)\s+from\s+['"](\.[^'"]*?)['"];?/g,
      (match, exports, path) => {
        // Only add .js if the path doesn't already have an extension
        if (!path.match(/\.[a-zA-Z0-9]+$/)) {
          modified = true;
          return `export ${exports} from '${path}.js';`;
        }
        return match;
      }
    );

    if (modified) {
      writeFileSync(file, content, 'utf8');
      console.log(`Fixed imports in: ${file}`);
    }
  }
}

fixImports().catch(console.error);