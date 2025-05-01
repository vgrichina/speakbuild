import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { formatExamplesFromContent } from '../src/utils/exampleFormatter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Format examples using Node.js file system
export const formatExamples = async () => {
  // Map of examples to load
  const exampleMap = {
    'input/list/editable/light': '../assets/examples/listComponent.txt',
    // Add other examples as needed
  };
  
  // Load example files using Node.js fs
  const exampleContents = {};
  
  for (const [url, filePath] of Object.entries(exampleMap)) {
    try {
      const fullPath = path.join(__dirname, filePath);
      exampleContents[url] = await fs.promises.readFile(fullPath, 'utf8');
    } catch (error) {
      console.error(`Failed to load example file ${filePath}:`, error);
    }
  }
  
  // Use the shared formatter
  return formatExamplesFromContent(exampleContents);
};
