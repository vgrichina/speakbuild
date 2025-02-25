import * as FileSystem from 'expo-file-system';

// Map URLs to example file paths
const URL_TO_EXAMPLE_MAP = {
  'input/list/editable/light': 'assets/examples/listComponent.js',
  'display/chart.svg/bar/light': 'assets/examples/barChart.svg.js'
};

// Helper function to read example file content
const readExampleFile = async (filePath) => {
  try {
    // Read from the asset bundle
    const fileUri = FileSystem.bundleDirectory + filePath;
    return await FileSystem.readAsStringAsync(fileUri);
  } catch (error) {
    console.warn(`Could not read example file ${filePath}:`, error);
    return `function Component(props) {\n  return React.createElement(RN.Text, null, "Example not available");\n}`;
  }
};

// Helper function to format examples for the prompt
const formatExamples = async () => {
  let result = '';
  
  // Process each example
  for (const [url, filePath] of Object.entries(URL_TO_EXAMPLE_MAP)) {
    const name = url.split('/').pop().replace('light', '').trim();
    const source = await readExampleFile(filePath);
    
    result += `\n${Object.keys(URL_TO_EXAMPLE_MAP).indexOf(url) + 1}. ${name.charAt(0).toUpperCase() + name.slice(1)} Component (${url}):\n\`\`\`\n${source}\n\`\`\`\n`;
  }
  
  return result;
};

export { URL_TO_EXAMPLE_MAP, formatExamples };
