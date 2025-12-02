// backend/test-list-models.js
// This will show you all available Gemini models for your API key

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    console.log('🔍 Fetching available Gemini models...\n');
    
    const models = await genAI.listModels();
    
    console.log('✅ Available models:\n');
    
    for (const model of models) {
      console.log(`📌 ${model.name}`);
      console.log(`   Display Name: ${model.displayName}`);
      console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ')}`);
      console.log('');
    }
    
    console.log('\n💡 Use one of these model names in your code.');
    
  } catch (error) {
    console.error('❌ Error listing models:', error.message);
    console.log('\n🔧 Trying alternative method...\n');
    
    // Try common model names
    const modelsToTry = [
      'gemini-pro',
      'gemini-1.0-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'models/gemini-pro',
      'models/gemini-1.5-flash'
    ];
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`Testing: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Say hi');
        const response = await result.response;
        const text = response.text();
        console.log(`✅ ${modelName} WORKS!`);
        console.log(`Response: ${text}\n`);
      } catch (err) {
        console.log(`❌ ${modelName} failed: ${err.message}\n`);
      }
    }
  }
}

listModels();