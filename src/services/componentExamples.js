const fs = require('fs');
const path = require('path');

// Map URLs to example file paths
const URL_TO_EXAMPLE_MAP = {
  'input/list/editable/light': 'examples/listComponent.js',
  'display/icon.svg/button/light': 'examples/iconComponent.svg.js',
  'display/progress.svg/circle/light': 'examples/progressCircle.svg.js',
  'display/chart.svg/bar/light': 'examples/barChart.svg.js'
};

// Helper function to read example file content
const readExampleFile = (filePath) => {
  return fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8');
};

// Helper function to format examples for the prompt
const formatExamples = () => {
  let result = '';
  
  // Process each example
  Object.entries(URL_TO_EXAMPLE_MAP).forEach(([url, filePath], index) => {
    const name = url.split('/').pop().replace('light', '').trim();
    const source = readExampleFile(filePath);
    
    result += `\n${index + 1}. ${name.charAt(0).toUpperCase() + name.slice(1)} Component (${url}):\n\`\`\`\n${source}\n\`\`\`\n`;
  });
  
  return result;
};

module.exports = { URL_TO_EXAMPLE_MAP, formatExamples };
