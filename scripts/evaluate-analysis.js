import { analyzeRequest } from '../src/services/analysis.js';
import testCases from '../src/evaluation/analysisCases.json' assert { type: "json" };
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runEvaluation({ 
    model = 'anthropic/claude-3.5-sonnet',
}) {
    const results = [];
    const startTime = Date.now();
    
    for (const testCase of testCases.testCases) {
        console.log(`Running analysis: "${testCase.request}"`);
        const caseStartTime = Date.now();
        
        try {
            const analysis = await analyzeRequest(
                testCase.request,
                new AbortController(),
                testCase.history || [],
                (testCase.history?.length || 0) - 1,
                testCase.history?.length ? testCase.history[testCase.history.length - 1].params : null
            );

            const success = analysis &&
                analysis.intent === testCase.expectedIntent &&
                analysis.widgetUrl === testCase.expectedUrl &&
                JSON.stringify(analysis.params) === JSON.stringify(testCase.expectedParams);

            results.push({
                request: testCase.request,
                history: testCase.history,
                expected: {
                    intent: testCase.expectedIntent,
                    widgetUrl: testCase.expectedUrl,
                    params: testCase.expectedParams
                },
                actual: analysis,
                duration: Date.now() - caseStartTime,
                success,
            });

        } catch (error) {
            console.error('Analysis failed:', error);
            results.push({
                request: testCase.request,
                history: testCase.history,
                expected: {
                    intent: testCase.expectedIntent,
                    widgetUrl: testCase.expectedUrl,
                    params: testCase.expectedParams
                },
                actual: null,
                duration: Date.now() - caseStartTime,
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
    
    return `# Analysis Prompt Evaluation Results

## Summary
- **Model**: ${summary.model}
- **Date**: ${new Date(summary.runId).toISOString()}
- **Success Rate**: ${successRate}%
- **Average Analysis Time**: ${avgDuration}s per request
- **Total Duration**: ${(summary.totalDuration / 1000).toFixed(1)}s

## Test Cases

${summary.results.map(result => `
### Request: "${result.request}"
${result.history ? `**History**:
${result.history.map(h => `- "${h.request}" (params: ${JSON.stringify(h.params)})`).join('\n')}` : ''}

**Expected**:
\`\`\`json
${JSON.stringify(result.expected, null, 2)}
\`\`\`

**Actual**:
\`\`\`json
${JSON.stringify(result.actual, null, 2)}
\`\`\`

- **Status**: ${result.success ? '✅ Success' : '❌ Failed'}
- **Duration**: ${(result.duration / 1000).toFixed(1)}s
${result.error ? `- **Error**: ${result.error}` : ''}
`).join('\n')}`;
}

async function main() {
    const args = process.argv.slice(2);
    const model = args[0] || 'anthropic/claude-3.5-sonnet';
    
    console.log(`Running analysis evaluation with model: ${model}`);
    
    try {
        const results = await runEvaluation({ model });
        const report = generateMarkdownReport(results);

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `analysis-${timestamp}-${model.split('/')[1]}.md`;
        const outputPath = path.join(process.cwd(), 'evaluations', filename);

        await fs.mkdir(path.join(process.cwd(), 'evaluations'), { recursive: true });
        await fs.writeFile(outputPath, report);

        console.log(`Analysis evaluation report saved to: ${outputPath}`);
    } catch (error) {
        console.error('Evaluation failed:', error.stack || error);
        process.exit(1);
    }
}

main();
