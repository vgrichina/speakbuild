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

            results.push({
                request: testCase.request,
                history: testCase.history?.map(h => h.request) || [],
                analysis,
                duration: Date.now() - caseStartTime
            });

        } catch (error) {
            console.error('Analysis failed:', error);
            results.push({
                request: testCase.request,
                history: testCase.history?.map(h => h.request) || [],
                analysis: null,
                duration: Date.now() - caseStartTime,
                error: error.message
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
    const avgDuration = (summary.totalDuration / summary.results.length / 1000).toFixed(1);
    
    return `# Analysis Results - ${summary.model}

Run at: ${new Date(summary.runId).toISOString()}
Average time: ${avgDuration}s per request
Total time: ${(summary.totalDuration / 1000).toFixed(1)}s

${summary.results.map(result => `
### "${result.request}"
${result.history.length ? `After: ${result.history.map(h => `"${h}"`).join(' → ')}\n` : ''}
\`\`\`json
${JSON.stringify(result.analysis || result.error, null, 2)}
\`\`\`
${(result.duration / 1000).toFixed(1)}s
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
