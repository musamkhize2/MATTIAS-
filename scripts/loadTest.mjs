#!/usr/bin/env node

/**
 * Load Testing Script for MATTIAS
 * Simulates 25 concurrent users performing typical operations
 * Tests: analytics queries, auth checks, profile access
 */

import http from "http";
import https from "https";
import { performance } from "perf_hooks";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || "25");
const DURATION_SECONDS = parseInt(process.env.DURATION_SECONDS || "60");
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Metrics collection
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalTime: 0,
  responseTimes: [],
  errors: [],
};

/**
 * Make an HTTP request
 */
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === "https:";
    const client = isHttps ? https : http;

    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: REQUEST_TIMEOUT,
    };

    const startTime = performance.now();

    const req = client.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        metrics.totalRequests++;
        metrics.responseTimes.push(responseTime);
        metrics.totalTime += responseTime;

        if (res.statusCode >= 200 && res.statusCode < 300) {
          metrics.successfulRequests++;
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null,
            responseTime,
          });
        } else {
          metrics.failedRequests++;
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on("error", (error) => {
      metrics.failedRequests++;
      metrics.errors.push(error.message);
      reject(error);
    });

    req.on("timeout", () => {
      req.destroy();
      metrics.failedRequests++;
      metrics.errors.push("Request timeout");
      reject(new Error("Request timeout"));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Simulate a user session
 */
async function simulateUserSession(userId) {
  const operations = [
    // Operation 1: Get all campaigns
    async () => {
      try {
        await makeRequest("GET", "/api/trpc/analytics.getAllCampaignsMetrics?input=%7B%22limit%22:50%7D");
      } catch (error) {
        // Expected - campaigns may not exist
      }
    },

    // Operation 2: Get campaign metrics
    async () => {
      try {
        await makeRequest("GET", "/api/trpc/analytics.getCampaignMetrics?input=%7B%22campaignId%22:%22test%22%7D");
      } catch (error) {
        // Expected - campaign may not exist
      }
    },

    // Operation 3: Get engagement timeline
    async () => {
      try {
        await makeRequest("GET", "/api/trpc/analytics.getEngagementTimeline?input=%7B%22campaignId%22:%22test%22%7D");
      } catch (error) {
        // Expected - campaign may not exist
      }
    },

    // Operation 4: Get auth status
    async () => {
      try {
        await makeRequest("GET", "/api/trpc/auth.me");
      } catch (error) {
        // Expected - may not be authenticated
      }
    },

    // Operation 5: Get user profile
    async () => {
      try {
        await makeRequest("GET", "/api/trpc/users.getProfile");
      } catch (error) {
        // Expected - may not be authenticated
      }
    },
  ];

  const startTime = Date.now();
  const endTime = startTime + DURATION_SECONDS * 1000;

  let operationCount = 0;

  while (Date.now() < endTime) {
    const operation = operations[operationCount % operations.length];
    await operation();
    operationCount++;

    // Small delay between operations
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return operationCount;
}

/**
 * Run load test
 */
async function runLoadTest() {
  console.log("🚀 Starting MATTIAS Load Test");
  console.log(`📊 Configuration:`);
  console.log(`   - Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`   - Duration: ${DURATION_SECONDS} seconds`);
  console.log(`   - Base URL: ${BASE_URL}`);
  console.log(`   - Request Timeout: ${REQUEST_TIMEOUT}ms`);
  console.log("");

  const startTime = performance.now();

  // Create user sessions
  const userPromises = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    userPromises.push(simulateUserSession(i));
  }

  // Wait for all users to complete
  const results = await Promise.allSettled(userPromises);
  const endTime = performance.now();

  // Calculate statistics
  const totalDuration = (endTime - startTime) / 1000;
  const avgResponseTime = metrics.totalRequests > 0 ? metrics.totalTime / metrics.totalRequests : 0;
  const minResponseTime = metrics.responseTimes.length > 0 ? Math.min(...metrics.responseTimes) : 0;
  const maxResponseTime = metrics.responseTimes.length > 0 ? Math.max(...metrics.responseTimes) : 0;
  const successRate = metrics.totalRequests > 0 ? (metrics.successfulRequests / metrics.totalRequests) * 100 : 0;

  // Calculate percentiles
  const sortedTimes = [...metrics.responseTimes].sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;

  // Print results
  console.log("📈 Load Test Results:");
  console.log("─".repeat(50));
  console.log(`Total Duration:        ${totalDuration.toFixed(2)}s`);
  console.log(`Total Requests:        ${metrics.totalRequests}`);
  console.log(`Successful:            ${metrics.successfulRequests} (${successRate.toFixed(2)}%)`);
  console.log(`Failed:                ${metrics.failedRequests}`);
  console.log("");
  console.log("Response Time Statistics (ms):");
  console.log(`  Min:                 ${minResponseTime.toFixed(2)}`);
  console.log(`  Max:                 ${maxResponseTime.toFixed(2)}`);
  console.log(`  Average:             ${avgResponseTime.toFixed(2)}`);
  console.log(`  Median (P50):        ${p50.toFixed(2)}`);
  console.log(`  P95:                 ${p95.toFixed(2)}`);
  console.log(`  P99:                 ${p99.toFixed(2)}`);
  console.log("");
  console.log(`Requests/sec:          ${(metrics.totalRequests / totalDuration).toFixed(2)}`);
  console.log("");

  if (metrics.errors.length > 0) {
    console.log("⚠️  Errors Encountered:");
    const errorCounts = {};
    metrics.errors.forEach((error) => {
      errorCounts[error] = (errorCounts[error] || 0) + 1;
    });
    Object.entries(errorCounts).forEach(([error, count]) => {
      console.log(`   - ${error}: ${count} times`);
    });
    console.log("");
  }

  // Determine if test passed
  const passed = successRate >= 90 && maxResponseTime < 5000;
  console.log(passed ? "✅ Load Test PASSED" : "⚠️  Load Test completed (check metrics above)");
  console.log("─".repeat(50));

  process.exit(passed ? 0 : 1);
}

// Run the test
runLoadTest().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
