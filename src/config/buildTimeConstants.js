/**
 * Build-time constants
 * 
 * This file attempts to import values from buildTimeSecrets.js (gitignored)
 * which is generated during the build process. If that file doesn't exist,
 * it falls back to empty values.
 */

// Default empty values
const DEFAULT_CONSTANTS = {
  TEST_ULTRAVOX_KEY: '',
  TEST_OPENROUTER_KEY: '',
};

// Try to import the secrets file (which may not exist)
let SECRETS = DEFAULT_CONSTANTS;
try {
  // We use dynamic import with require to avoid errors if the file doesn't exist
  SECRETS = require('./buildTimeSecrets').SECRETS;
  console.log('Using build-time secrets');
} catch (error) {
  console.log('No build-time secrets found, using defaults');
}

export const BUILD_TIME_CONSTANTS = {
  ...DEFAULT_CONSTANTS,
  ...SECRETS
};