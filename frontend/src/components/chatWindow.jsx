import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

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
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>💬 AI Chat Assistant</h3>
          <p style={styles.subtitle}>Powered by Google Gemini AI 🤖</p>
        </div>
        <div style={styles.controls}>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={styles.languageSelect}
          >
            <option value="en">🇬🇧 English</option>
            <option value="hi">🇮🇳 हिंदी</option>
            <option value="pa">🇮🇳 ਪੰਜਾਬੀ</option>
          </select>
          <button onClick={handleClearHistory} style={styles.clearBtn}>
            🗑️ Clear
          </button>
        </div>
      </div>

      <div style={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>👋 Start a conversation!</p>
            <p style={styles.emptySubtext}>Ask me anything about health, reminders, or how I can help you.</p>
            <p style={styles.emptySubtext}>🎤 You can type or use voice input!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              style={{
                ...styles.messageWrapper,
                justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div
                style={{
                  ...styles.message,
                  ...(msg.type === 'user' ? styles.userMessage : styles.botMessage)
                }}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div style={styles.messageWrapper}>
            <div style={{ ...styles.message, ...styles.botMessage }}>
              <span style={styles.typing}>●●●</span> Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={styles.inputContainer}>
        <button
          onClick={handleVoiceInput}
          style={{
            ...styles.voiceBtn,
            backgroundColor: isListening ? '#dc3545' : '#007bff'
          }}
          title="Voice input"
        >
          {isListening ? '🎤 Listening...' : '🎤'}
        </button>
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={
            language === 'hi' ? 'अपना संदेश टाइप करें या 🎤 दबाएं...' :
            language === 'pa' ? 'ਆਪਣਾ ਸੁਨੇਹਾ ਟਾਈਪ ਕਰੋ ਜਾਂ 🎤 ਦਬਾਓ...' :
            'Type your message or press 🎤...'
          }
          style={styles.input}
          rows={2}
        />
        <button
          onClick={handleSend}
          disabled={loading || !inputMessage.trim()}
          style={{
            ...styles.sendBtn,
            opacity: loading || !inputMessage.trim() ? 0.5 : 1,
            cursor: loading || !inputMessage.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          📤
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 100px)',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px',
    borderBottom: '2px solid #f0f0f0',
    backgroundColor: '#f8f9fa',
    flexWrap: 'wrap',
    gap: '10px'
  },
  title: {
    margin: 0,
    color: '#333'
  },
  subtitle: {
    margin: '5px 0 0 0',
    color: '#666',
    fontSize: '12px'
  },
  controls: {
    display: 'flex',
    gap: '10px'
  },
  languageSelect: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '14px',
    cursor: 'pointer'
  },
  clearBtn: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    backgroundColor: '#fafafa'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#999'
  },
  emptyText: {
    fontSize: '20px',
    marginBottom: '10px'
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#aaa',
    marginBottom: '5px'
  },
  messageWrapper: {
    display: 'flex',
    marginBottom: '16px'
  },
  message: {
    maxWidth: '70%',
    padding: '12px 16px',
    borderRadius: '12px',
    lineHeight: '1.5',
    fontSize: '15px',
    wordWrap: 'break-word'
  },
  userMessage: {
    backgroundColor: '#007bff',
    color: 'white',
    borderBottomRightRadius: '4px'
  },
  botMessage: {
    backgroundColor: 'white',
    color: '#333',
    border: '1px solid #e0e0e0',
    borderBottomLeftRadius: '4px'
  },
  typing: {
    animation: 'blink 1.4s infinite',
    fontSize: '20px',
    letterSpacing: '2px'
  },
  inputContainer: {
    display: 'flex',
    gap: '8px',
    padding: '20px',
    borderTop: '2px solid #f0f0f0',
    backgroundColor: 'white'
  },
  voiceBtn: {
    padding: '12px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    cursor: 'pointer',
    minWidth: '60px'
  },
  input: {
    flex: 1,
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '15px',
    resize: 'none',
    fontFamily: 'inherit',
    outline: 'none'
  },
  sendBtn: {
    padding: '12px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '20px',
    cursor: 'pointer'
  }
};

export default ChatWindow;