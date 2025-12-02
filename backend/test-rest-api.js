// backend/test-rest-api.js
// Test Gemini using REST API (no SDK needed)

import dotenv from 'dotenv';
dotenv.config();

async function testRestAPI() {
  try {
    console.log('🔑 API Key:', process.env.GEMINI_API_KEY ? 'Found ✅' : 'Missing ❌');
    console.log('\n🧪 Testing Gemini REST API...\n');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const requestBody = {
      contents: [{
        parts: [{
          text: 'Say hello in one sentence'
        }]
      }]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status);
      console.error('Error details:', errorText);
      
      if (response.status === 400) {
        console.log('\n🔧 Fix: Check your API key is valid');
        console.log('Get new key: https://aistudio.google.com/app/apikey');
      } else if (response.status === 404) {
        console.log('\n🔧 Fix: Model not available for your region/account');
        console.log('Try creating a new Google account and API key');
      }
      return;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text) {
      console.log('✅ SUCCESS! Gemini REST API is working!\n');
      console.log('📝 Response:', text);
      console.log('\n✅ You can now use chat.js with REST API');
    } else {
      console.log('⚠️  Response received but no text found');
      console.log('Response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n🔧 Fix: Check internet connection');
    }
  }
}

testRestAPI();