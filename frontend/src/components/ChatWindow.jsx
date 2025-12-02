import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Mic, Send, Trash2 } from 'lucide-react';

function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadChatHistory();
    initializeSpeechRecognition();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Update recognition language when language changes
    if (recognition) {
      const langCodes = {
        en: 'en-US',
        hi: 'hi-IN',
        pa: 'pa-IN'
      };
      recognition.lang = langCodes[language] || 'en-US';
    }
  }, [language, recognition]);

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onstart = () => {
        setIsListening(true);
        console.log('🎤 Listening...');
      };

      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('📝 Transcript:', transcript);
        setInputMessage(transcript);
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        alert('Voice input error: ' + event.error);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
        console.log('🎤 Stopped listening');
      };

      setRecognition(recognitionInstance);
    } else {
      console.log('Speech recognition not supported');
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await api.get('/chat/history');
      const history = response.data.messages.map(msg => [
        { type: 'user', text: msg.user_message, timestamp: msg.created_at },
        { type: 'bot', text: msg.bot_response, timestamp: msg.created_at }
      ]).flat();
      setMessages(history);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleVoiceInput = () => {
    if (!recognition) {
      alert('Voice input not supported in this browser');
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const handleSend = async () => {
    if (!inputMessage.trim()) return;

    const userMsg = inputMessage.trim();
    setInputMessage('');

    // Add user message to chat
    setMessages(prev => [...prev, {
      type: 'user',
      text: userMsg,
      timestamp: new Date().toISOString()
    }]);

    setLoading(true);

    try {
      const response = await api.post('/chat/message', {
        message: userMsg,
        language: language
      });

      // Add bot response to chat
      setMessages(prev => [...prev, {
        type: 'bot',
        text: response.data.botResponse,
        timestamp: response.data.timestamp
      }]);

      // Speak response
      speakText(response.data.botResponse, language);

    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        type: 'bot',
        text: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all chat history?')) return;

    try {
      await api.delete('/chat/history');
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear history:', error);
      alert('Failed to clear chat history');
    }
  };

  const speakText = (text, lang) => {
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'pa' ? 'pa-IN' : 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="glass-panel flex flex-col h-full rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl">
      {/* Chat Header */}
      <div className="p-5 border-b-2 border-white/10 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              💬 Chat Assistant
            </h3>
            <p className="text-xs text-slate-400 mt-1">Powered by HuggingFace AI 🤗</p>
          </div>
          <div className="flex gap-3">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-4 py-2 rounded-xl bg-slate-900 border-2 border-slate-700 text-white text-sm font-semibold focus:border-primary outline-none cursor-pointer transition-all"
            >
              <option value="en">🇬🇧 English</option>
              <option value="hi">🇮🇳 हिंदी</option>
              <option value="pa">🇮🇳 ਪੰਜਾਬੀ</option>
            </select>
            <button
              onClick={handleClearHistory}
              className="px-4 py-2 bg-danger/20 text-danger border-2 border-danger/30 rounded-xl text-sm font-bold hover:bg-danger/30 transition-all flex items-center gap-2"
            >
              <Trash2 size={16} />
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-900/20 to-transparent custom-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
              <span className="text-5xl">👋</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Start a Conversation!</h3>
            <p className="text-slate-400 mb-2">Ask me anything about health, reminders, or how I can help you.</p>
            <p className="text-slate-500 text-sm">🎤 You can type or use voice input!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div
                className={`max-w-[75%] px-5 py-3 rounded-2xl shadow-lg ${msg.type === 'user'
                    ? 'bg-gradient-to-r from-primary to-blue-600 text-white rounded-br-sm'
                    : 'bg-slate-800 text-slate-100 rounded-bl-sm border-2 border-slate-700'
                  }`}
              >
                <p className="text-base leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-slate-800 text-slate-300 rounded-2xl rounded-bl-sm border-2 border-slate-700 px-5 py-4 flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="text-sm font-medium">AI is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area with Glow */}
      <div className="p-5 border-t-2 border-white/10 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
        <div className="flex gap-3 items-end">
          <button
            onClick={handleVoiceInput}
            className={`p-4 rounded-2xl transition-all duration-300 flex-shrink-0 ${isListening
                ? 'bg-danger text-white animate-pulse shadow-lg shadow-danger/40 scale-110'
                : 'bg-slate-700 text-primary hover:bg-slate-600 hover:scale-105'
              }`}
            title="Voice input"
          >
            <Mic size={24} />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                language === 'hi' ? 'अपना संदेश लिखें...' :
                  language === 'pa' ? 'ਆਪਣਾ ਸੁਨੇਹਾ ਲਿਖੋ...' :
                    'Type your message...'
              }
              className="w-full px-5 py-4 bg-slate-900 border-2 border-slate-700 rounded-2xl text-white placeholder-slate-500 resize-none outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all"
              rows="2"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim() || loading}
            className={`p-4 rounded-2xl transition-all flex-shrink-0 ${inputMessage.trim() && !loading
                ? 'bg-gradient-to-r from-primary to-blue-600 text-white hover:scale-105 shadow-lg shadow-primary/40'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            title="Send message"
          >
            <Send size={24} />
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-3 text-center">
          Press <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700">Enter</kbd> to send, <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700">Shift + Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}

export default ChatWindow;