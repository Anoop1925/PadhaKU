'use client';

import { useEffect, useState, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { Mic, MicOff, Bot, User } from 'lucide-react';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
};

type AiMentorUIProps = {
  imageSrc: string;
};

const AiMentorUI = ({ imageSrc }: AiMentorUIProps) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callStarted, setCallStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const vapiRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check if environment variables are available
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

    // Debug logging
    console.log('🔍 Environment variables check:');
    console.log('Public Key exists:', !!publicKey);
    console.log('Assistant ID exists:', !!assistantId);

    if (!publicKey || !assistantId) {
      const missingVars = [];
      if (!publicKey) missingVars.push('NEXT_PUBLIC_VAPI_PUBLIC_KEY');
      if (!assistantId) missingVars.push('NEXT_PUBLIC_VAPI_ASSISTANT_ID');
      
      setError(`Vapi configuration is missing: ${missingVars.join(', ')}. Please set these environment variables.`);
      return;
    }

    try {
      console.log('🚀 Initializing Vapi');
      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;

      vapi.on('call-start', () => {
        console.log('📞 Call started');
        setIsSpeaking(true);
        setCallStarted(true);
        setError(null);
        
        // Add welcome message
        const welcomeMsg: Message = {
          id: Date.now().toString(),
          text: "Hi! I'm EduBuddy, your AI learning assistant. Start speaking and I'll respond!",
          sender: 'assistant',
          timestamp: new Date()
        };
        setMessages([welcomeMsg]);
      });

      vapi.on('call-end', () => {
        console.log('🛑 Call ended');
        setIsSpeaking(false);
        setCallStarted(false);
        setIsAssistantSpeaking(false);
      });

      // Capture conversation messages
      vapi.on('message', (message: any) => {
        console.log('📨 Message event:', message);
        
        // Handle transcript messages
        if (message.type === 'transcript' && message.transcriptType === 'final') {
          if (message.role === 'user' && message.transcript) {
            // User message
            const userMsg: Message = {
              id: Date.now().toString() + '-user',
              text: message.transcript,
              sender: 'user',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, userMsg]);
          } else if (message.role === 'assistant' && message.transcript) {
            // Assistant message
            const assistantMsg: Message = {
              id: Date.now().toString() + '-assistant',
              text: message.transcript,
              sender: 'assistant',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMsg]);
            setIsAssistantSpeaking(false);
          }
        }

        // Detect when assistant starts speaking
        if (message.type === 'speech-update' && message.role === 'assistant') {
          if (message.status === 'started') {
            setIsAssistantSpeaking(true);
          } else if (message.status === 'stopped') {
            setIsAssistantSpeaking(false);
          }
        }
      });

      vapi.on('speech-start', () => {
        console.log('🎤 User started speaking');
        setIsSpeaking(true);
      });

      vapi.on('speech-end', () => {
        console.log('🎤 User stopped speaking');
        setIsSpeaking(false);
      });

      vapi.on('error', (e: any) => {
        console.error('❗ Vapi error:', e);
        setIsSpeaking(false);
        setCallStarted(false);
        setError(e?.message || 'An error occurred with the Vapi service');
      });

      console.log('✅ Vapi initialized successfully');
      return () => {
        if (vapiRef.current) {
          vapiRef.current.stop();
        }
      };
    } catch (err: any) {
      console.error('Failed to initialize Vapi:', err);
      setError(err?.message || 'Failed to initialize Vapi service');
    }
  }, []);

  const handleStartCall = async () => {
    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
    
    if (!assistantId) {
      setError('Assistant ID is not configured');
      return;
    }

    if (!vapiRef.current) {
      setError('Vapi is not initialized');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('🎯 Starting call with assistant ID:', assistantId);
      await vapiRef.current.start(assistantId);
    } catch (err: any) {
      console.error('Failed to start call:', err);
      setError(err?.message || 'Failed to start call');
      setIsLoading(false);
    }
  };

  const handleEndCall = () => {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
    setIsLoading(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center w-full py-8 px-4">
        <div className="max-w-2xl w-full mx-auto rounded-xl p-6 shadow-sm border border-red-200 bg-red-50">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Configuration Error</h2>
            <p className="text-sm text-gray-700 mb-4 text-center">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-5 py-2 bg-[#387BFF] hover:bg-[#2563eb] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-[calc(100vh-120px)] max-w-4xl mx-auto">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-[#387BFF] to-[#2563eb] text-white p-4 rounded-t-xl shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">EduBuddy Voice Assistant</h2>
              <p className="text-xs text-blue-100">
                {callStarted ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    {isSpeaking ? 'You are speaking...' : isAssistantSpeaking ? 'EduBuddy is responding...' : 'Connected'}
                  </span>
                ) : (
                  'Click start to begin'
                )}
              </p>
            </div>
          </div>
          
          {callStarted && (
            <button
              onClick={handleEndCall}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
            >
              <MicOff className="w-4 h-4" />
              End Call
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 bg-white border-x border-slate-200 overflow-y-auto p-4 space-y-4">
        {!callStarted ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#387BFF] to-[#2563eb] flex items-center justify-center mb-4">
              <Mic className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Start Your Voice Learning Session</h3>
            <p className="text-sm text-gray-600 mb-6 max-w-md">
              Click the button below to start talking with EduBuddy. Your conversation will appear here in a chat format.
            </p>
            <button
              onClick={handleStartCall}
              disabled={isLoading}
              className="px-8 py-3 bg-gradient-to-r from-[#387BFF] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] disabled:bg-gray-400 text-white rounded-lg font-semibold text-base shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed"
            >
              <span className="inline-flex items-center gap-2">
                {isLoading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    Start Voice Chat
                  </>
                )}
              </span>
            </button>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.sender === 'user' 
                    ? 'bg-blue-500' 
                    : 'bg-gradient-to-br from-purple-500 to-pink-500'
                }`}>
                  {message.sender === 'user' ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`flex flex-col max-w-[70%] ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${
                      message.sender === 'user'
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-slate-100 text-slate-900 rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {message.text}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 mt-1 px-1">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isAssistantSpeaking && (
              <div className="flex items-end gap-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Chat Footer */}
      {callStarted && (
        <div className="bg-slate-50 border-t border-x border-slate-200 rounded-b-xl p-4">
          <div className="flex items-center gap-3">
            <div className={`flex-1 px-4 py-3 bg-white border-2 rounded-lg ${
              isSpeaking ? 'border-blue-500 shadow-lg shadow-blue-100' : 'border-slate-200'
            } transition-all`}>
              <div className="flex items-center gap-2">
                {isSpeaking ? (
                  <>
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-4 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1 h-6 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '100ms' }}></div>
                      <div className="w-1 h-5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                      <div className="w-1 h-7 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                      <div className="w-1 h-4 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                    </div>
                    <span className="text-sm font-medium text-blue-600">Listening...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-500">Start speaking to chat with EduBuddy</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 text-center mt-2">
            Your voice is being transcribed in real-time
          </p>
        </div>
      )}
    </div>
  );
};

export default AiMentorUI;
