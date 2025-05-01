import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { api } from '../src/services/api.js';
import { formatExamples } from './nodeFormatExamples.js';
import { createComponentGeneration } from '../src/services/componentGeneration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test cases using fs instead of import assertion
async function loadTestCases() {
  const testCasesPath = path.join(__dirname, '../src/evaluation/generationTestCases.json');
  const data = await fs.readFile(testCasesPath, 'utf8');
  return JSON.parse(data);
}

async function runEvaluation({ 
    model = 'anthropic/claude-3.5-sonnet',
}) {
    const results = [];
    const startTime = Date.now();
    
    // Load test cases
    const testCases = await loadTestCases();
    
    for (const testCase of testCases.testCases) {
        console.log(`Running test: ${testCase.widgetUrl}`);
        const caseStartTime = Date.now();
        let fullResponse = '';
        
        try {
            let generatedCode = '';
            // Get API key from environment variable for evaluation
            const apiKey = process.env.OPENROUTER_API_KEY;
            if (!apiKey) {
                throw new Error('OPENROUTER_API_KEY environment variable must be set for evaluation');
            }
            
            // Get formatted examples
            const examplesText = await formatExamples();
            
            // Use promise for more straightforward handling
            await new Promise((resolve, reject) => {
                let responseText = '';
                
                // Create component generation with callbacks
                const generation = createComponentGeneration(testCase, {
                    examplesText,
                    onProgress: (content) => {
                        responseText += content;
                        process.stdout.write(content); // Show progress
                    },
                    onComplete: (result) => {
                        if (result?.code) {
                            generatedCode = result.code;
                            resolve();
                        } else {
                            reject(new Error('No code was generated'));
                        }
                    },
                    onError: (error) => {
                        reject(error);
                    },
                    currentComponentCode: testCase.currentComponentCode || null,
                    selectedModel: model,
                    apiKey
                });
                
                // Start the generation
                generation.start().catch(reject);
            });
            
            fullResponse = generatedCode;

            results.push({
                widgetUrl: testCase.widgetUrl,
                intent: testCase.intent,
                params: testCase.params,
                duration: Date.now() - caseStartTime,
                response: fullResponse,
                success: true,
                error: null
            });

        } catch (error) {
            console.error('Test failed:', error);
            results.push({
                widgetUrl: testCase.widgetUrl,
                intent: testCase.intent,
                params: testCase.params,
                duration: Date.now() - caseStartTime,
                response: fullResponse,
                success: false,
                error: error.stack || error.message
            });
        }
    }

    return {
        runId: Date.now(),
        model,
        totalDuration: Date.now() - startTime,
        results
    };
}

function generateMarkdownReport(summary) {
    const successRate = (summary.results.filter(r => r.success).length / summary.results.length * 100).toFixed(1);
    const avgDuration = (summary.totalDuration / summary.results.length / 1000).toFixed(1);
    
    return `# Component Generation Evaluation Results

## Summary
- **Model**: ${summary.model}
- **Date**: ${new Date(summary.runId).toISOString()}
- **Success Rate**: ${successRate}%
- **Average Generation Time**: ${avgDuration}s per component
- **Total Duration**: ${(summary.totalDuration / 1000).toFixed(1)}s

## Test Cases

${summary.results.map(result => `
### ${result.intent === 'new' ? 'New Component' : 'Component Modification'}
**Widget URL**: \`${result.widgetUrl}\`
**Parameters**: \`${JSON.stringify(result.params)}\`
- **Status**: ${result.success ? '✅ Success' : '❌ Failed'}
- **Duration**: ${(result.duration / 1000).toFixed(1)}s
${result.error ? `- **Error**: ${result.error}` : ''}

${result.response}
`).join('\n')}`;
}

async function main() {
    const args = process.argv.slice(2);
    const model = args[0] || 'anthropic/claude-3.5-sonnet';
    
    console.log(`Running evaluation with model: ${model}`);
    
    try {
        const results = await runEvaluation({ model });
        const report = generateMarkdownReport(results);

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `evaluation-${timestamp}-${model.split('/')[1]}.md`;
        const outputPath = path.join(process.cwd(), 'evaluations', filename);

        await fs.mkdir(path.join(process.cwd(), 'evaluations'), { recursive: true });
        await fs.writeFile(outputPath, report);

        console.log(`Evaluation report saved to: ${outputPath}`);
    } catch (error) {
        console.error('Evaluation failed:', error.stack || error);
        process.exit(1);
    }
}

main();
