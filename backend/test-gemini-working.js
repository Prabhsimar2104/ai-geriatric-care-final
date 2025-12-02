// backend/test-gemini-working.js
// Test with gemini-pro (most compatible)

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  try {
    console.log('🔑 API Key:', process.env.GEMINI_API_KEY ? 'Found ✅' : 'Missing ❌');
    console.log('\n🧪 Testing gemini-pro model...\n');
    
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const result = await model.generateContent('Say hello in one sentence');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ SUCCESS! Gemini API is working!\n');
    console.log('📝 Response:', text);
    console.log('\n✅ You can use "gemini-pro" in your chat.js');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('\n🔧 Fix: Get a new API key from https://makersuite.google.com/app/apikey');
    } else if (error.message.includes('404')) {
      console.log('\n🔧 Fix: Try different model name (see test-list-models.js)');
    } else if (error.message.includes('quota')) {
      console.log('\n🔧 Fix: Wait 24 hours or upgrade your plan');
    }
  }
}

test();