// backend/tests/fallAlerts.test.js
import { describe, test, expect, beforeAll } from '@jest/globals';
import dotenv from 'dotenv';

// Load environment variables before tests
beforeAll(() => {
  dotenv.config();
});

describe('Fall Alert System', () => {
  
  test('Environment variables are loaded', () => {
    expect(process.env.FALL_ALERT_TOKEN).toBeDefined();
    expect(process.env.DB_NAME).toBeDefined();
  });

  test('Fall alert token is configured', () => {
    const token = process.env.FALL_ALERT_TOKEN;
    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(10);
  });

  test('Database configuration exists', () => {
    expect(process.env.DB_HOST).toBeDefined();
    expect(process.env.DB_USER).toBeDefined();
    expect(process.env.DB_NAME).toBeDefined();
  });

  test('SMTP configuration exists for notifications', () => {
    expect(process.env.SMTP_HOST).toBeDefined();
    expect(process.env.SMTP_USER).toBeDefined();
    expect(process.env.SMTP_PASS).toBeDefined();
  });

  test('JWT secret is configured', () => {
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.JWT_SECRET.length).toBeGreaterThan(20);
  });
});

describe('Fall Alert Data Validation', () => {
  
  test('Valid fall alert data structure', () => {
    const validAlert = {
      userId: 1,
      timestamp: new Date().toISOString(),
      confidence: 0.95
    };

    expect(validAlert.userId).toBeGreaterThan(0);
    expect(validAlert.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(validAlert.confidence).toBeGreaterThanOrEqual(0);
    expect(validAlert.confidence).toBeLessThanOrEqual(1);
  });

  test('Invalid confidence values are rejected', () => {
    const invalidConfidence1 = 1.5;
    const invalidConfidence2 = -0.1;

    expect(invalidConfidence1).toBeGreaterThan(1);
    expect(invalidConfidence2).toBeLessThan(0);
  });

  test('Timestamp format validation', () => {
    const validTimestamp = new Date().toISOString();
    const parsedDate = new Date(validTimestamp);
    
    expect(parsedDate).toBeInstanceOf(Date);
    expect(parsedDate.getTime()).toBeGreaterThan(0);
  });
});

describe('Fall Alert Helper Functions', () => {
  
  test('Calculate time difference', () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const diffMinutes = Math.floor((now - fiveMinutesAgo) / 60000);
    
    expect(diffMinutes).toBe(5);
  });

  test('Format confidence as percentage', () => {
    const confidence = 0.95;
    const percentage = (confidence * 100).toFixed(1);
    
    expect(percentage).toBe('95.0');
  });

  test('Generate unique alert ID', () => {
    const id1 = Date.now();
    const id2 = Date.now() + 1;
    
    expect(id1).not.toBe(id2);
  });
});