/**
 * Pure formatting function for component examples
 * No dependencies on file loading mechanisms
 */
export const formatExamplesFromContent = (exampleContents) => {
  let result = '';
  
  let index = 1;
  for (const [url, content] of Object.entries(exampleContents)) {
    const name = url.split('/').pop().replace('light', '').trim();
    result += `\n${index}. ${name.charAt(0).toUpperCase() + name.slice(1)} Component (${url}):\n\`\`\`\n${content}\n\`\`\`\n`;
    index++;
  }
  
  return result;
};
