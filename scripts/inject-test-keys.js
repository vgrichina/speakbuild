/**
 * Script to inject test API keys into the build
 * 
 * Usage:
 *   yarn inject-keys
 * 
 * This reads values from .env file and creates a gitignored buildTimeSecrets.js file with the API keys
 */

const fs = require('fs');
const path = require('path');
// Load .env file
require('dotenv').config();

// Get API keys from environment variables
const ultravoxKey = process.env.TEST_ULTRAVOX_KEY || '';
const openrouterKey = process.env.TEST_OPENROUTER_KEY || '';

console.log(`SpeakBuild: Injecting test keys...`);

// Path to the secrets file (which is gitignored)
const secretsPath = path.join(__dirname, '../src/config/buildTimeSecrets.js');

// Create the directory if it doesn't exist
const dirPath = path.dirname(secretsPath);
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
}

// Create the secrets file content
const secretsContent = `/**
 * IMPORTANT: This file is generated during the build process and should not be committed.
 * It contains API keys that are only for testing purposes.
 * 
 * SpeakBuild.ai - Configuration
 */

export const SECRETS = {
  TEST_ULTRAVOX_KEY: '${ultravoxKey}',
  TEST_OPENROUTER_KEY: '${openrouterKey}',
};
`;

// Write the file
fs.writeFileSync(secretsPath, secretsContent, 'utf8');

console.log('SpeakBuild: Test keys injected successfully to', secretsPath);
