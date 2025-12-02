import db from '../db.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
    const userLanguage = language || req.user.preferred_language || 'en';

    // Get conversation context (last 10 messages)
    const context = await getConversationContext(userId, 10);

    // Get AI response with context
    const botResponse = await getGeminiResponse(message, userLanguage, context, userId);

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
    console.error('Chat error:', error);
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
    console.error('Get chat history error:', error);
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
    console.error('Clear chat error:', error);
    res.status(500).json({
      error: 'Failed to clear chat history',
      message: error.message
    });
  }
};

// Get conversation context (last N messages)
const getConversationContext = async (userId, limit = 10) => {
  try {
    const [messages] = await db.query(
      `SELECT user_message, bot_response 
       FROM chat_messages 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, limit]
    );

    // Reverse to get chronological order
    return messages.reverse();
  } catch (error) {
    console.error('Error getting context:', error);
    return [];
  }
};

// Get AI response using Google Gemini with context
import fetch from "node-fetch"; // if Node < 18, else remove this line

const getGeminiResponse = async (message, language, context, userId) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not found in .env");
      return getFallbackResponse(message, language);
    }

    // Personalization
    const [users] = await db.query(
      "SELECT name, role FROM users WHERE id = ?",
      [userId]
    );
    const userName = users[0]?.name || "User";
    const userRole = users[0]?.role || "elderly";

    // Build conversation context
    let contextString = "";
    if (context && context.length > 0) {
      contextString = "Previous conversation:\n";
      context.forEach((msg) => {
        contextString += `User: ${msg.user_message}\nAssistant: ${msg.bot_response}\n`;
      });
      contextString += "\n";
    }

    // System prompts by language
    const systemPrompts = {
      en: `You are a caring AI assistant for elderly care. Your name is Care AI. The user's name is ${userName} (${userRole}).
You help with:
- Medicine reminders and health advice
- Daily wellness tips
- Answering health questions
- Providing emotional support
- General elderly care guidance

Be warm, patient, and use simple language. Keep responses concise (2-3 sentences).
${contextString}`,

      hi: `आप बुजुर्गों की देखभाल के लिए एक सहायक AI हैं। आपका नाम केयर AI है। उपयोगकर्ता का नाम ${userName} (${userRole}) है।
आप मदद करते हैं:
- दवा रिमाइंडर और स्वास्थ्य सलाह
- दैनिक स्वास्थ्य सुझाव
- स्वास्थ्य प्रश्नों के उत्तर
- भावनात्मक समर्थन
- सामान्य बुजुर्ग देखभाल मार्गदर्शन

गर्मजोशी से, धैर्य से, और सरल भाषा में जवाब दें। संक्षिप्त उत्तर दें (2-3 वाक्य)।
${contextString}`,

      pa: `ਤੁਸੀਂ ਬਜ਼ੁਰਗਾਂ ਦੀ ਦੇਖਭਾਲ ਲਈ ਇੱਕ ਸਹਾਇਕ AI ਹੋ। ਤੁਹਾਡਾ ਨਾਮ ਕੇਅਰ AI ਹੈ। ਉਪਭੋਗਤਾ ਦਾ ਨਾਮ ${userName} (${userRole}) ਹੈ।
ਤੁਸੀਂ ਮਦਦ ਕਰਦੇ ਹੋ:
- ਦਵਾਈ ਰਿਮਾਈਂਡਰ ਅਤੇ ਸਿਹਤ ਸਲਾਹ
- ਰੋਜ਼ਾਨਾ ਸਿਹਤ ਸੁਝਾਅ
- ਸਿਹਤ ਸਵਾਲਾਂ ਦੇ ਜਵਾਬ
- ਭਾਵਨਾਤਮਿਕ ਸਹਾਇਤਾ
- ਆਮ ਬਜ਼ੁਰਗ ਦੇਖਭਾਲ ਮਾਰਗਦਰਸ਼ਨ

ਨਿੱਘ ਨਾਲ, ਧੀਰਜ ਨਾਲ, ਅਤੇ ਸਰਲ ਭਾਸ਼ਾ ਵਿੱਚ ਜਵਾਬ ਦਿਓ। ਸੰਖੇਪ ਜਵਾਬ ਦਿਓ (2-3 ਵਾਕ)।
${contextString}`
    };

    const systemPrompt = systemPrompts[language] || systemPrompts.en;
    const fullPrompt = `${systemPrompt}\n\nCurrent message: ${message}`;

    // --- Use a real model id from your list ---
    const MODEL_ID = process.env.GEMINI_MODEL || "models/gemini-2.5-flash";

    // 1) Try SDK route first (works if your installed SDK supports it)
    try {
      const model = genAI.getGenerativeModel({
        model: MODEL_ID,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 200
        }
      });

      // if model.generate exists -> use it
      if (typeof model.generate === "function") {
        const sdkResp = await model.generate({ input: fullPrompt });
        // try common response fields
        // 1) sdkResp.outputText
        if (sdkResp.outputText) return String(sdkResp.outputText);
        // 2) sdkResp.output?.[0]?.content?.[0]?.text
        if (sdkResp.output && Array.isArray(sdkResp.output) && sdkResp.output.length) {
          const content = sdkResp.output[0]?.content?.[0];
          if (content && content.text) return String(content.text);
        }
        // 3) sdkResp.response?.outputText
        if (sdkResp.response?.outputText) return String(sdkResp.response.outputText);
        // fallback: stringify
        return JSON.stringify(sdkResp).slice(0, 2000);
      }

      // if model.generateContent exists (older shape you used)
      if (typeof model.generateContent === "function") {
        const result = await model.generateContent(fullPrompt);
        // result.response could be a Promise or object
        const respObj = result.response || result;
        // try response.text() if available
        if (typeof respObj.text === "function") {
          const text = await respObj.text();
          return String(text);
        }
        if (respObj.outputText) return String(respObj.outputText);
        return JSON.stringify(respObj).slice(0, 2000);
      }

      // no generate method found on model -> fallthrough to REST
      console.warn("SDK model object has no generate / generateContent method; falling back to REST.");
    } catch (sdkErr) {
      console.warn("SDK generate attempt failed, will fallback to REST:", sdkErr && sdkErr.message ? sdkErr.message : sdkErr);
    }

    // 2) REST fallback — guaranteed to work as long as API key is valid
    try {
      const url = `https://generativelanguage.googleapis.com/v1/${MODEL_ID}:generate`;
      const body = {
        text: { input: fullPrompt },
        temperature: 0.7,
        maxOutputTokens: 200
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("REST generate error:", res.status, data);
        return getFallbackResponse(message, language);
      }

      // Common places where text may exist
      if (typeof data.outputText === "string" && data.outputText.length) return data.outputText;
      // v1 sometimes returns: data.candidates[0].content[0].text or data.candidates[0].content[0].text
      const maybeCandidateText =
        data.candidates?.[0]?.content?.find(c => c.text)?.text ||
        data.candidates?.[0]?.content?.[0]?.text ||
        data.candidates?.[0]?.outputText;
      if (maybeCandidateText) return String(maybeCandidateText);

      // older v1 responses: data.output?.[0]?.content?.[0]?.text
      const alt = data.output?.[0]?.content?.[0]?.text;
      if (alt) return String(alt);

      // nothing found -> fallback to stringified JSON (short)
      return JSON.stringify(data).slice(0, 2000);
    } catch (restErr) {
      console.error("REST fallback failed:", restErr && restErr.message ? restErr.message : restErr);
      return getFallbackResponse(message, language);
    }
  } catch (error) {
    console.error("Gemini AI error:", error);
    return getFallbackResponse(message, language);
  }
};

// Fallback responses if AI fails
const getFallbackResponse = (message, language) => {
  const responses = {
    en: "I'm here to help! Could you please rephrase your question?",
    hi: "मैं मदद के लिए यहाँ हूँ! कृपया अपना सवाल दोबारा पूछें?",
    pa: "ਮੈਂ ਮਦਦ ਲਈ ਇੱਥੇ ਹਾਂ! ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਸਵਾਲ ਦੁਬਾਰਾ ਪੁੱਛੋ?"
  };
  return responses[language] || responses.en;
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
    console.error('Error saving chat message:', error);
  }
};