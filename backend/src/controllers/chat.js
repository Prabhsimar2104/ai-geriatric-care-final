// backend/src/controllers/chat.js
// COMPLETE REPLACEMENT WITH HUGGINGFACE

import db from '../db.js';
import dotenv from 'dotenv';

dotenv.config();

// HuggingFace API Configuration
const HF_API_URL = 'https://huggingface.co/api/models';
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || 'hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

// Send message to AI bot
export const sendMessage = async (req, res) => {
  try {
    const { message, language } = req.body;

    if (!message) {
      return res.status(400).json({
        error: 'Message is required'
      });
    }

    const userId = req.user.id;
    const userLanguage = language || 'en';

    // Get user info for personalization
    const [users] = await db.query(
      'SELECT name, role FROM users WHERE id = ?',
      [userId]
    );
    const userName = users[0]?.name || 'User';
    const userRole = users[0]?.role || 'elderly';

    // Get conversation context (last 5 messages)
    const context = await getConversationContext(userId, 5);

    // Get AI response
    const botResponse = await getHuggingFaceResponse(
      message,
      userLanguage,
      context,
      userName,
      userRole
    );

    // Store chat history
    await saveChatMessage(userId, message, botResponse, userLanguage);

    res.json({
      success: true,
      userMessage: message,
      botResponse: botResponse,
      language: userLanguage,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: error.message
    });
  }
};

// Get chat history
export const getChatHistory = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const [messages] = await db.query(
      `SELECT * FROM chat_messages 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [req.user.id, parseInt(limit)]
    );

    res.json({
      success: true,
      messages: messages.reverse() // oldest first
    });

  } catch (error) {
    console.error('❌ Get chat history error:', error);
    res.status(500).json({
      error: 'Failed to get chat history',
      message: error.message
    });
  }
};

// Clear chat history
export const clearChatHistory = async (req, res) => {
  try {
    await db.query(
      'DELETE FROM chat_messages WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'Chat history cleared'
    });

  } catch (error) {
    console.error('❌ Clear chat error:', error);
    res.status(500).json({
      error: 'Failed to clear chat history',
      message: error.message
    });
  }
};

// Get conversation context (last N messages)
const getConversationContext = async (userId, limit = 5) => {
  try {
    const [messages] = await db.query(
      `SELECT user_message, bot_response 
       FROM chat_messages 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, limit]
    );

    return messages.reverse();
  } catch (error) {
    console.error('❌ Error getting context:', error);
    return [];
  }
};

// Get AI response using HuggingFace API
const getHuggingFaceResponse = async (message, language, context, userName, userRole) => {
  try {
    // Check if API key is set
    if (!HF_API_KEY || HF_API_KEY.includes('xxxx')) {
      console.warn('⚠️ HuggingFace API key not set, using fallback');
      return getFallbackResponse(message, language, userName);
    }

    // Build context string
    let conversationHistory = '';
    if (context && context.length > 0) {
      context.forEach((msg) => {
        conversationHistory += `User: ${msg.user_message}\nAssistant: ${msg.bot_response}\n`;
      });
    }

    // Create system prompt based on language
    const systemPrompts = {
      en: `You are a caring AI assistant for elderly care. User: ${userName} (${userRole}). 
Help with medicine reminders, health advice, wellness tips, and emotional support. 
Be warm, patient, and use simple language. Keep responses under 3 sentences.`,

      hi: `आप बुजुर्गों की देखभाल के लिए एक सहायक AI हैं। उपयोगकर्ता: ${userName} (${userRole})।
दवा रिमाइंडर, स्वास्थ्य सलाह और भावनात्मक समर्थन में मदद करें।
गर्मजोशी से, धैर्य से, और सरल भाषा में जवाब दें। संक्षिप्त उत्तर दें (2-3 वाक्य)।`,

      pa: `ਤੁਸੀਂ ਬਜ਼ੁਰਗਾਂ ਦੀ ਦੇਖਭਾਲ ਲਈ ਇੱਕ ਸਹਾਇਕ AI ਹੋ। ਉਪਭੋਗਤਾ: ${userName} (${userRole})।
ਦਵਾਈ ਰਿਮਾਈਂਡਰ, ਸਿਹਤ ਸਲਾਹ ਅਤੇ ਭਾਵਨਾਤਮਿਕ ਸਹਾਇਤਾ ਵਿੱਚ ਮਦਦ ਕਰੋ।
ਨਿੱਘ ਨਾਲ, ਧੀਰਜ ਨਾਲ, ਅਤੇ ਸਰਲ ਭਾਸ਼ਾ ਵਿੱਚ ਜਵਾਬ ਦਿਓ। ਸੰਖੇਪ ਜਵਾਬ ਦਿਓ (2-3 ਵਾਕ)।`
    };

    const systemPrompt = systemPrompts[language] || systemPrompts.en;
    
    // Combine system prompt, context, and current message
    const fullPrompt = `${systemPrompt}\n\n${conversationHistory}\nUser: ${message}\nAssistant:`;

    // Call HuggingFace API
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: {
          max_length: 150,
          temperature: 0.7,
          top_p: 0.9,
          do_sample: true
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ HuggingFace API Error:', response.status, errorData);
      
      // If model is loading, return friendly message
      if (response.status === 503) {
        return language === 'hi' 
          ? 'AI मॉडल लोड हो रहा है। कृपया 20 सेकंड प्रतीक्षा करें और फिर से प्रयास करें।'
          : language === 'pa'
          ? 'AI ਮਾਡਲ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ 20 ਸਕਿੰਟ ਉਡੀਕ ਕਰੋ ਅਤੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
          : 'AI model is loading. Please wait 20 seconds and try again.';
      }
      
      return getFallbackResponse(message, language, userName);
    }

    const data = await response.json();
    
    // Extract response from HuggingFace format
    let botResponse = '';
    
    if (Array.isArray(data) && data.length > 0) {
      botResponse = data[0].generated_text || '';
    } else if (data.generated_text) {
      botResponse = data.generated_text;
    }

    // Clean up response (remove prompt)
    if (botResponse.includes('Assistant:')) {
      botResponse = botResponse.split('Assistant:').pop().trim();
    }

    // If response is empty or too short, use fallback
    if (!botResponse || botResponse.length < 10) {
      return getFallbackResponse(message, language, userName);
    }

    // Limit response length
    const sentences = botResponse.split(/[.!?]+/);
    botResponse = sentences.slice(0, 3).join('. ').trim();
    
    // Add period if missing
    if (botResponse && !botResponse.match(/[.!?]$/)) {
      botResponse += '.';
    }

    return botResponse || getFallbackResponse(message, language, userName);

  } catch (error) {
    console.error('❌ HuggingFace API error:', error);
    return getFallbackResponse(message, language, userName);
  }
};

// Fallback responses if AI fails
const getFallbackResponse = (message, language, userName = 'User') => {
  const lowerMessage = message.toLowerCase();
  
  // === GREETINGS ===
  if (lowerMessage.match(/^(hi|hello|hey|hola|namaste|नमस्ते|ਸਤ ਸ੍ਰੀ ਅਕਾਲ)$/i)) {
    const greetings = {
      en: [
        `Hello ${userName}! I'm your AI care assistant. How can I help you today?`,
        `Hi ${userName}! Great to see you. What can I do for you?`,
        `Hey ${userName}! I'm here to help with your health and wellness. What do you need?`
      ],
      hi: [
        `नमस्ते ${userName}! मैं आपका AI देखभाल सहायक हूं। आज मैं आपकी कैसे मदद कर सकता हूं?`,
        `हैलो ${userName}! आपको देखकर अच्छा लगा। मैं आपके लिए क्या कर सकता हूं?`,
        `नमस्कार ${userName}! मैं आपकी सेहत में मदद के लिए यहां हूं।`
      ],
      pa: [
        `ਸਤ ਸ੍ਰੀ ਅਕਾਲ ${userName}! ਮੈਂ ਤੁਹਾਡਾ AI ਦੇਖਭਾਲ ਸਹਾਇਕ ਹਾਂ। ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?`,
        `ਹੈਲੋ ${userName}! ਤੁਹਾਨੂੰ ਦੇਖ ਕੇ ਚੰਗਾ ਲੱਗਿਆ। ਮੈਂ ਤੁਹਾਡੇ ਲਈ ਕੀ ਕਰ ਸਕਦਾ ਹਾਂ?`,
        `ਨਮਸਕਾਰ ${userName}! ਮੈਂ ਤੁਹਾਡੀ ਸਿਹਤ ਵਿੱਚ ਮਦਦ ਲਈ ਇੱਥੇ ਹਾਂ।`
      ]
    };
    const options = greetings[language] || greetings.en;
    return options[Math.floor(Math.random() * options.length)];
  }

  // === MEDICINE / MEDICATION ===
  if (lowerMessage.includes('medicine') || lowerMessage.includes('medication') || 
      lowerMessage.includes('pill') || lowerMessage.includes('tablet') ||
      lowerMessage.includes('दवा') || lowerMessage.includes('दवाई') ||
      lowerMessage.includes('ਦਵਾਈ')) {
    const responses = {
      en: [
        `I can help you set medicine reminders, ${userName}! What medicine do you need to take and at what time?`,
        `${userName}, I'll help you remember your medications. Tell me the medicine name and when you need to take it.`,
        `Let me assist you with your medicine schedule. Which medication would you like to set a reminder for?`
      ],
      hi: [
        `${userName}, मैं आपको दवा रिमाइंडर सेट करने में मदद कर सकता हूं! कौन सी दवा और किस समय लेनी है?`,
        `मैं आपकी दवाओं को याद रखने में मदद करूंगा। दवा का नाम और समय बताएं।`,
        `आइए आपकी दवा का शेड्यूल बनाते हैं। किस दवा के लिए रिमाइंडर चाहिए?`
      ],
      pa: [
        `${userName}, ਮੈਂ ਤੁਹਾਨੂੰ ਦਵਾਈ ਰਿਮਾਈਂਡਰ ਸੈੱਟ ਕਰਨ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ! ਕਿਹੜੀ ਦਵਾਈ ਅਤੇ ਕਿਸ ਸਮੇਂ ਲੈਣੀ ਹੈ?`,
        `ਮੈਂ ਤੁਹਾਡੀਆਂ ਦਵਾਈਆਂ ਯਾਦ ਰੱਖਣ ਵਿੱਚ ਮਦਦ ਕਰਾਂਗਾ। ਦਵਾਈ ਦਾ ਨਾਮ ਅਤੇ ਸਮਾਂ ਦੱਸੋ।`,
        `ਆਓ ਤੁਹਾਡੀ ਦਵਾਈ ਦਾ ਸ਼ਡਿਊਲ ਬਣਾਈਏ। ਕਿਸ ਦਵਾਈ ਲਈ ਰਿਮਾਈਂਡਰ ਚਾਹੀਦਾ ਹੈ?`
      ]
    };
    const options = responses[language] || responses.en;
    return options[Math.floor(Math.random() * options.length)];
  }

  // === HEALTH / FEELING ===
  if (lowerMessage.includes('health') || lowerMessage.includes('feel') || 
      lowerMessage.includes('sick') || lowerMessage.includes('pain') ||
      lowerMessage.includes('स्वास्थ्य') || lowerMessage.includes('बीमार') ||
      lowerMessage.includes('ਸਿਹਤ') || lowerMessage.includes('ਬੀਮਾਰ')) {
    const responses = {
      en: [
        `${userName}, I'm here to listen. Can you describe how you're feeling? Any specific symptoms?`,
        `Your health is important to me. Tell me what's bothering you, and I'll try to help.`,
        `I understand you're concerned about your health. What symptoms are you experiencing?`
      ],
      hi: [
        `${userName}, मैं सुनने के लिए यहां हूं। आप कैसा महसूस कर रहे हैं? कोई विशेष लक्षण?`,
        `आपकी सेहत मेरे लिए महत्वपूर्ण है। बताएं क्या परेशान कर रहा है।`,
        `मैं समझता हूं कि आप अपनी सेहत को लेकर चिंतित हैं। कौन से लक्षण हैं?`
      ],
      pa: [
        `${userName}, ਮੈਂ ਸੁਣਨ ਲਈ ਇੱਥੇ ਹਾਂ। ਤੁਸੀਂ ਕਿਵੇਂ ਮਹਿਸੂਸ ਕਰ ਰਹੇ ਹੋ? ਕੋਈ ਖਾਸ ਲੱਛਣ?`,
        `ਤੁਹਾਡੀ ਸਿਹਤ ਮੇਰੇ ਲਈ ਮਹੱਤਵਪੂਰਨ ਹੈ। ਦੱਸੋ ਕੀ ਪਰੇਸ਼ਾਨ ਕਰ ਰਿਹਾ ਹੈ।`,
        `ਮੈਂ ਸਮਝਦਾ ਹਾਂ ਕਿ ਤੁਸੀਂ ਆਪਣੀ ਸਿਹਤ ਬਾਰੇ ਚਿੰਤਤ ਹੋ। ਕਿਹੜੇ ਲੱਛਣ ਹਨ?`
      ]
    };
    const options = responses[language] || responses.en;
    return options[Math.floor(Math.random() * options.length)];
  }

  // === FOOD / BREAKFAST / LUNCH / DINNER ===
  if (lowerMessage.includes('food') || lowerMessage.includes('eat') || 
      lowerMessage.includes('breakfast') || lowerMessage.includes('lunch') || 
      lowerMessage.includes('dinner') || lowerMessage.includes('भोजन') || 
      lowerMessage.includes('खाना') || lowerMessage.includes('ਖਾਣਾ') ||
      lowerMessage.includes('ਭੋਜਨ')) {
    const responses = {
      en: [
        `${userName}, good nutrition is important! For elderly care, I recommend light, balanced meals with fruits, vegetables, and protein. What specific food advice do you need?`,
        `Let's talk about healthy eating! Are you looking for breakfast, lunch, or dinner suggestions?`,
        `Nutrition matters at every age. Would you like healthy meal ideas or help with dietary restrictions?`
      ],
      hi: [
        `${userName}, अच्छा पोषण महत्वपूर्ण है! बुजुर्गों के लिए हल्का, संतुलित भोजन अच्छा है - फल, सब्जियां, प्रोटीन। कौन सी खाने की सलाह चाहिए?`,
        `स्वस्थ भोजन के बारे में बात करते हैं! नाश्ता, दोपहर का खाना, या रात के खाने के सुझाव चाहिए?`,
        `हर उम्र में पोषण महत्वपूर्ण है। स्वस्थ भोजन के विचार चाहिए या आहार प्रतिबंधों में मदद?`
      ],
      pa: [
        `${userName}, ਚੰਗਾ ਪੋਸ਼ਣ ਮਹੱਤਵਪੂਰਨ ਹੈ! ਬਜ਼ੁਰਗਾਂ ਲਈ ਹਲਕਾ, ਸੰਤੁਲਿਤ ਭੋਜਨ ਚੰਗਾ ਹੈ - ਫਲ, ਸਬਜ਼ੀਆਂ, ਪ੍ਰੋਟੀਨ। ਕਿਹੜੀ ਖਾਣੇ ਦੀ ਸਲਾਹ ਚਾਹੀਦੀ ਹੈ?`,
        `ਸਿਹਤਮੰਦ ਖਾਣੇ ਬਾਰੇ ਗੱਲ ਕਰੀਏ! ਨਾਸ਼ਤਾ, ਦੁਪਹਿਰ ਦਾ ਖਾਣਾ, ਜਾਂ ਰਾਤ ਦੇ ਖਾਣੇ ਦੇ ਸੁਝਾਅ ਚਾਹੀਦੇ ਹਨ?`,
        `ਹਰ ਉਮਰ ਵਿੱਚ ਪੋਸ਼ਣ ਮਹੱਤਵਪੂਰਨ ਹੈ। ਸਿਹਤਮੰਦ ਭੋਜਨ ਦੇ ਵਿਚਾਰ ਜਾਂ ਖੁਰਾਕ ਪਾਬੰਦੀਆਂ ਵਿੱਚ ਮਦਦ ਚਾਹੀਦੀ ਹੈ?`
      ]
    };
    const options = responses[language] || responses.en;
    return options[Math.floor(Math.random() * options.length)];
  }

  // === REMINDER / SCHEDULE ===
  if (lowerMessage.includes('reminder') || lowerMessage.includes('remind') || 
      lowerMessage.includes('schedule') || lowerMessage.includes('time') ||
      lowerMessage.includes('रिमाइंडर') || lowerMessage.includes('याद') ||
      lowerMessage.includes('ਰਿਮਾਈਂਡਰ') || lowerMessage.includes('ਯਾਦ')) {
    const responses = {
      en: [
        `${userName}, I can help set reminders for medicines, meals, water intake, or appointments. What would you like to be reminded about?`,
        `Let's set up a reminder! Tell me what you need to remember and when.`,
        `I'm great at remembering things for you! What reminder should I set up?`
      ],
      hi: [
        `${userName}, मैं दवा, भोजन, पानी, या अपॉइंटमेंट के रिमाइंडर सेट कर सकता हूं। किसके लिए रिमाइंडर चाहिए?`,
        `चलिए रिमाइंडर सेट करते हैं! बताएं क्या याद रखना है और कब।`,
        `मैं आपके लिए चीजें याद रखने में अच्छा हूं! कौन सा रिमाइंडर सेट करूं?`
      ],
      pa: [
        `${userName}, ਮੈਂ ਦਵਾਈ, ਭੋਜਨ, ਪਾਣੀ, ਜਾਂ ਮੁਲਾਕਾਤਾਂ ਲਈ ਰਿਮਾਈਂਡਰ ਸੈੱਟ ਕਰ ਸਕਦਾ ਹਾਂ। ਕਿਸ ਲਈ ਰਿਮਾਈਂਡਰ ਚਾਹੀਦਾ ਹੈ?`,
        `ਆਓ ਰਿਮਾਈਂਡਰ ਸੈੱਟ ਕਰੀਏ! ਦੱਸੋ ਕੀ ਯਾਦ ਰੱਖਣਾ ਹੈ ਅਤੇ ਕਦੋਂ।`,
        `ਮੈਂ ਤੁਹਾਡੇ ਲਈ ਚੀਜ਼ਾਂ ਯਾਦ ਰੱਖਣ ਵਿੱਚ ਚੰਗਾ ਹਾਂ! ਕਿਹੜਾ ਰਿਮਾਈਂਡਰ ਸੈੱਟ ਕਰਾਂ?`
      ]
    };
    const options = responses[language] || responses.en;
    return options[Math.floor(Math.random() * options.length)];
  }

  // === HELP / EMERGENCY ===
  if (lowerMessage.includes('help') || lowerMessage.includes('emergency') || 
      lowerMessage.includes('urgent') || lowerMessage.includes('मदद') ||
      lowerMessage.includes('आपातकाल') || lowerMessage.includes('ਮਦਦ') ||
      lowerMessage.includes('ਐਮਰਜੈਂਸੀ')) {
    const responses = {
      en: [
        `${userName}, I'm here to help! For medical emergencies, please call your emergency contact or 108/112. For other help, tell me what you need.`,
        `If this is a medical emergency, please seek immediate help! Otherwise, let me know how I can assist you.`,
        `I want to help you, ${userName}. Is this urgent? For emergencies, contact your caregiver or call emergency services immediately.`
      ],
      hi: [
        `${userName}, मैं मदद के लिए यहां हूं! चिकित्सा आपातकाल के लिए, कृपया 108/112 पर कॉल करें। अन्य मदद के लिए, बताएं क्या चाहिए।`,
        `यदि यह चिकित्सा आपातकाल है, तो कृपया तुरंत मदद लें! अन्यथा, बताएं मैं कैसे मदद कर सकता हूं।`,
        `मैं आपकी मदद करना चाहता हूं, ${userName}। क्या यह जरूरी है? आपातकाल के लिए, अपने देखभालकर्ता से संपर्क करें।`
      ],
      pa: [
        `${userName}, ਮੈਂ ਮਦਦ ਲਈ ਇੱਥੇ ਹਾਂ! ਡਾਕਟਰੀ ਐਮਰਜੈਂਸੀ ਲਈ, ਕਿਰਪਾ ਕਰਕੇ 108/112 'ਤੇ ਕਾਲ ਕਰੋ। ਹੋਰ ਮਦਦ ਲਈ, ਦੱਸੋ ਕੀ ਚਾਹੀਦਾ ਹੈ।`,
        `ਜੇ ਇਹ ਡਾਕਟਰੀ ਐਮਰਜੈਂਸੀ ਹੈ, ਤਾਂ ਕਿਰਪਾ ਕਰਕੇ ਤੁਰੰਤ ਮਦਦ ਲਓ! ਨਹੀਂ ਤਾਂ, ਦੱਸੋ ਮੈਂ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ।`,
        `ਮੈਂ ਤੁਹਾਡੀ ਮਦਦ ਕਰਨਾ ਚਾਹੁੰਦਾ ਹਾਂ, ${userName}। ਕੀ ਇਹ ਜ਼ਰੂਰੀ ਹੈ? ਐਮਰਜੈਂਸੀ ਲਈ, ਆਪਣੇ ਦੇਖਭਾਲ ਕਰਨ ਵਾਲੇ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।`
      ]
    };
    const options = responses[language] || responses.en;
    return options[Math.floor(Math.random() * options.length)];
  }

  // === THANK YOU ===
  if (lowerMessage.includes('thank') || lowerMessage.includes('thanks') || 
      lowerMessage.includes('धन्यवाद') || lowerMessage.includes('शुक्रिया') ||
      lowerMessage.includes('ਧੰਨਵਾਦ') || lowerMessage.includes('ਸ਼ੁਕਰੀਆ')) {
    const responses = {
      en: [
        `You're welcome, ${userName}! I'm always here to help you.`,
        `My pleasure! Feel free to ask me anything anytime.`,
        `Happy to help, ${userName}! Take care of yourself.`
      ],
      hi: [
        `आपका स्वागत है, ${userName}! मैं हमेशा आपकी मदद के लिए यहां हूं।`,
        `मेरी खुशी है! कभी भी कुछ भी पूछने में संकोच न करें।`,
        `मदद करके खुशी हुई, ${userName}! अपना ख्याल रखें।`
      ],
      pa: [
        `ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ, ${userName}! ਮੈਂ ਹਮੇਸ਼ਾ ਤੁਹਾਡੀ ਮਦਦ ਲਈ ਇੱਥੇ ਹਾਂ।`,
        `ਮੇਰੀ ਖੁਸ਼ੀ ਹੈ! ਕਿਸੇ ਵੀ ਸਮੇਂ ਕੁਝ ਵੀ ਪੁੱਛਣ ਵਿੱਚ ਸੰਕੋਚ ਨਾ ਕਰੋ।`,
        `ਮਦਦ ਕਰਕੇ ਖੁਸ਼ੀ ਹੋਈ, ${userName}! ਆਪਣਾ ਖਿਆਲ ਰੱਖੋ।`
      ]
    };
    const options = responses[language] || responses.en;
    return options[Math.floor(Math.random() * options.length)];
  }

  // === DEFAULT FALLBACK (with variety) ===
  const defaultResponses = {
    en: [
      `I'm here to help you, ${userName}! I can assist with medicine reminders, health questions, and daily care. What would you like to know?`,
      `${userName}, I'm your health assistant. Ask me about medications, meal planning, health concerns, or setting reminders!`,
      `Hi ${userName}! I can help with your health needs. Try asking about medicines, food advice, or setting up reminders.`
    ],
    hi: [
      `${userName}, मैं आपकी मदद के लिए यहां हूं! मैं दवा रिमाइंडर, स्वास्थ्य प्रश्न और दैनिक देखभाल में सहायता कर सकता हूं।`,
      `${userName}, मैं आपका स्वास्थ्य सहायक हूं। दवाओं, भोजन योजना, स्वास्थ्य चिंताओं के बारे में पूछें!`,
      `नमस्ते ${userName}! मैं आपकी सेहत में मदद कर सकता हूं। दवाओं, खाने की सलाह, या रिमाइंडर के बारे में पूछें।`
    ],
    pa: [
      `${userName}, ਮੈਂ ਤੁਹਾਡੀ ਮਦਦ ਲਈ ਇੱਥੇ ਹਾਂ! ਮੈਂ ਦਵਾਈ ਰਿਮਾਈਂਡਰ, ਸਿਹਤ ਸਵਾਲ ਅਤੇ ਰੋਜ਼ਾਨਾ ਦੇਖਭਾਲ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ।`,
      `${userName}, ਮੈਂ ਤੁਹਾਡਾ ਸਿਹਤ ਸਹਾਇਕ ਹਾਂ। ਦਵਾਈਆਂ, ਭੋਜਨ ਯੋਜਨਾ, ਸਿਹਤ ਚਿੰਤਾਵਾਂ ਬਾਰੇ ਪੁੱਛੋ!`,
      `ਸਤ ਸ੍ਰੀ ਅਕਾਲ ${userName}! ਮੈਂ ਤੁਹਾਡੀ ਸਿਹਤ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ। ਦਵਾਈਆਂ, ਖਾਣੇ ਦੀ ਸਲਾਹ, ਜਾਂ ਰਿਮਾਈਂਡਰ ਬਾਰੇ ਪੁੱਛੋ।`
    ]
  };
  
  const options = defaultResponses[language] || defaultResponses.en;
  return options[Math.floor(Math.random() * options.length)];
};

// Save chat message to database
const saveChatMessage = async (userId, userMessage, botResponse, language) => {
  try {
    // Create table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        user_message TEXT NOT NULL,
        bot_response TEXT NOT NULL,
        language VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      )
    `);

    // Insert message
    await db.query(
      `INSERT INTO chat_messages (user_id, user_message, bot_response, language)
       VALUES (?, ?, ?, ?)`,
      [userId, userMessage, botResponse, language]
    );

  } catch (error) {
    console.error('❌ Error saving chat message:', error);
  }
};