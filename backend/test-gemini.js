import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Say hello in one sentence');
    const response = await result.response;
    const text = response.text();
    console.log('✅ Gemini API working!');
    console.log('Response:', text);
  } catch (error) {
    console.error('❌ Gemini API error:', error.message);
  }
}

test();