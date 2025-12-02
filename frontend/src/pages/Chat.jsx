import React from 'react';
import Layout from '../components/Layout';
import ChatWindow from '../components/ChatWindow';
import { Bot, Sparkles, MessageCircle, Mic } from 'lucide-react';

const Chat = () => {
  return (
    <Layout title="AI Chat">
      <div className="flex gap-6 h-[calc(100vh-120px)] animate-fade-in">
        {/* Left Panel - AI Assistant Info */}
        <div className="w-80 flex-shrink-0 space-y-6">
          {/* AI Assistant Card */}
          <div className="glass-panel p-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <Bot size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">AI Care Assistant</h2>
            <p className="text-slate-400 text-sm mb-4">Powered by HuggingFace AI 🤗</p>
            <div className="flex items-center justify-center gap-2 text-xs text-primary">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="font-semibold">Online & Ready</span>
            </div>
          </div>

          {/* Features Card */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles size={20} className="text-primary" />
              Features
            </h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <MessageCircle size={16} className="text-primary mt-0.5 flex-shrink-0" />
                <span>Ask health questions and get instant answers</span>
              </li>
              <li className="flex items-start gap-3">
                <Mic size={16} className="text-primary mt-0.5 flex-shrink-0" />
                <span>Voice input and text-to-speech support</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-0.5 flex-shrink-0">🌐</span>
                <span>Multi-language support (English, Hindi, Punjabi)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-0.5 flex-shrink-0">💡</span>
                <span>Personalized health recommendations</span>
              </li>
            </ul>
          </div>

          {/* Quick Tips Card */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-white mb-4">💬 Quick Tips</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>• Ask about medications</li>
              <li>• Get health advice</li>
              <li>• Set reminders</li>
              <li>• Emergency guidance</li>
            </ul>
          </div>
        </div>

        {/* Right Panel - Chat Window */}
        <div className="flex-1 min-w-0">
          <ChatWindow />
        </div>
      </div>
    </Layout>
  );
};

export default Chat;