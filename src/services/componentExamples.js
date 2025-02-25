import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

import listComponent from '../../assets/examples/listComponent.txt';

// Map URLs to example file paths and their require statements
const URL_TO_EXAMPLE_MAP = {
  'input/list/editable/light': listComponent,
  //'display/chart.svg/bar/light': {
  //  path: 'assets/examples/barChart.svg.txt',
  //  module: require('/assets/examples/barChart.svg.txt')
  //}
};

// Helper function to read example file content using expo-asset
const readExampleFile = async (module) => {
  try {
    // Create an asset reference and download it
    const asset = await Asset.fromModule(module).downloadAsync();
    
    // Read the file content using the localUri
    if (asset.localUri) {
      return await FileSystem.readAsStringAsync(asset.localUri);
    } else {
      throw new Error('Asset localUri is undefined');
    }
  } catch (error) {
    console.error(`Failed to load example file ${module.path}:`, error);
    throw new Error(`Could not load example file ${module.path}: ${error.message}`);
  }
};

// Helper function to format examples for the prompt
const formatExamples = async () => {
  let result = '';
  
  // Process each example
  for (const [url, module] of Object.entries(URL_TO_EXAMPLE_MAP)) {
    const name = url.split('/').pop().replace('light', '').trim();
    const source = await readExampleFile(module);
    
    result += `\n${Object.keys(URL_TO_EXAMPLE_MAP).indexOf(url) + 1}. ${name.charAt(0).toUpperCase() + name.slice(1)} Component (${url}):\n\`\`\`\n${source}\n\`\`\`\n`;
  }
  
  return result;
};

export { URL_TO_EXAMPLE_MAP, formatExamples };
