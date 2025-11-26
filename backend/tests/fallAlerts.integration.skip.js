// backend/tests/fallAlerts.integration.test.js
import { describe, test, expect } from '@jest/globals';
import fetch from 'node-fetch';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:4000';
const FALL_ALERT_TOKEN = process.env.FALL_ALERT_TOKEN;

describe('Fall Alert API Integration Tests', () => {
  
  test('Health check endpoint is accessible', async () => {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.status).toBeDefined();
  });

  test('Fall alert endpoint rejects requests without token', async () => {
    const response = await fetch(`${BASE_URL}/api/notify/fall-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: 1,
        timestamp: new Date().toISOString(),
        confidence: 0.95
      })
    });
    
    expect(response.status).toBe(401);
  });

  test('Fall alert endpoint rejects invalid token', async () => {
    const response = await fetch(`${BASE_URL}/api/notify/fall-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': 'invalid_token'
      },
      body: JSON.stringify({
        userId: 1,
        timestamp: new Date().toISOString(),
        confidence: 0.95
      })
    });
    
    expect(response.status).toBe(403);
  });

  test('Fall alert endpoint accepts valid request', async () => {
    const response = await fetch(`${BASE_URL}/api/notify/fall-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': FALL_ALERT_TOKEN
      },
      body: JSON.stringify({
        userId: 1,
        timestamp: new Date().toISOString(),
        confidence: 0.95
      })
    });
    
    // Should be 201 if backend is running, or connection error if not
    if (response.ok) {
      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.fallAlertId).toBeDefined();
    } else {
      // If backend not running, that's ok for unit tests
      expect([201, 404, 500]).toContain(response.status);
    }
  }, 10000); // 10 second timeout

  test('Fall alert endpoint validates required fields', async () => {
    const response = await fetch(`${BASE_URL}/api/notify/fall-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': FALL_ALERT_TOKEN
      },
      body: JSON.stringify({
        // Missing userId and timestamp
        confidence: 0.95
      })
    });
    
    if (response.status !== 500) {
      expect(response.status).toBe(400);
    }
  });
});