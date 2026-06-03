#!/usr/bin/env node

/**
 * Test company creation endpoint
 * This script tests the tRPC company.create mutation
 */

const API_URL = 'http://localhost:3000/api/trpc/company.create';

const testData = {
  name: 'The Millionaire Sales Institute',
  industry: 'Sales Training and Coaching',
  website: 'https://themillionairesalesinstitute.com',
  description: 'Sales training and coaching company',
  location: 'Online',
};

console.log('Testing company creation...');
console.log('API URL:', API_URL);
console.log('Test data:', JSON.stringify(testData, null, 2));
console.log('');

// Use curl to test since we don't have node-fetch
const { execSync } = await import('child_process');

try {
  const curlCmd = `curl -X POST "${API_URL}" \\
    -H "Content-Type: application/json" \\
    -d '${JSON.stringify({ json: testData })}'`;
  
  console.log('Running curl command...');
  const result = execSync(curlCmd, { encoding: 'utf-8' });
  console.log('Response:', result);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
