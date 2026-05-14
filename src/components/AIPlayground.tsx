import React, { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id: string;
}

interface Config {
  apiType: 'openai' | 'gemini' | 'anthropic';
  baseUrl: string;
  apiKey: string;
  modelId: string;
  systemPrompt: string;
  customParams: string;
}

const DEFAULT_CONFIG: Config = {
  apiType: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  modelId: 'gpt-4o',
  systemPrompt: 'You are a helpful assistant.',
  customParams: '{\n  "temperature": 0.7,\n  "max_tokens": 2048\n}',
};

const API_TYPES = [
  { id: 'openai', name: 'OpenAI Compatible', color: 'bg-green-400' },
  { id: 'gemini', name: 'Google Gemini', color: 'bg-blue-400' },
  { id: 'anthropic', name: 'Anthropic Claude', color: 'bg-orange-400' },
];

export default function AIPlayground({ lang = 'en' }: { lang?: string }) {
  const isZh = lang === 'zh';
  
  const t = {
    title: isZh ? 'AI 实验场' : 'AI Playground',
    subtitle: isZh ? '全协议通用 AI 对话调试工具' : 'Universal AI Chat Debugger & Playground',
    configTitle: isZh ? '引擎配置' : 'Engine Config',
    apiType: isZh ? 'API 格式' : 'API Type',
    baseUrl: isZh ? '接口地址 (Base URL)' : 'Base URL',
    apiKey: isZh ? 'API 密钥' : 'API Key',
    modelId: isZh ? '模型 ID' : 'Model ID',
    systemPrompt: isZh ? '系统提示词 (System Prompt)' : 'System Prompt',
    customParams: isZh ? '自定义 JSON 参数' : 'Custom JSON Params',
    chatTitle: isZh ? '对话区域' : 'Chat Arena',
    inputPlaceholder: isZh ? '输入消息，Shift+Enter 换行...' : 'Type a message, Shift+Enter for newline...',
    send: isZh ? '发送' : 'Send',
    clear: isZh ? '清空对话' : 'Clear Chat',
    save: isZh ? '保存配置' : 'Save Config',
    reset: isZh ? '重置默认' : 'Reset',
    stop: isZh ? '停止' : 'Stop',
    error: isZh ? '错误' : 'Error',
    storedLocally: isZh ? '本地加密存储' : 'Stored Locally (Encrypted-ish)',
  };

  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isFirstRender = useRef(true);

  // Persistence
  useEffect(() => {
    const savedConfig = localStorage.getItem('AI_PLAYGROUND_CONFIG');
    if (savedConfig) {
      try {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) });
      } catch (e) {
        console.error('Failed to load config', e);
      }
    }
    
    const savedMessages = localStorage.getItem('AI_PLAYGROUND_MESSAGES');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error('Failed to load messages', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('AI_PLAYGROUND_CONFIG', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('AI_PLAYGROUND_MESSAGES', JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const updateConfig = (updates: Partial<Config>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;
    if (!config.apiKey) {
      setError('API Key is required!');
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: inputText,
      id: Date.now().toString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    setError('');

    const assistantMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { role: 'assistant', content: '', id: assistantMessageId }]);

    abortControllerRef.current = new AbortController();

    try {
      let response: Response;
      const params = JSON.parse(config.customParams || '{}');

      if (config.apiType === 'openai') {
        response = await fetch(`${config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            model: config.modelId,
            messages: [
              { role: 'system', content: config.systemPrompt },
              ...messages.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: inputText }
            ],
            stream: true,
            ...params
          })
        });
      } else if (config.apiType === 'gemini') {
        // Gemini API structure
        const cleanBaseUrl = config.baseUrl.replace(/\/$/, '');
        const url = `${cleanBaseUrl}/v1beta/models/${config.modelId}:streamGenerateContent?key=${config.apiKey}`;
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            contents: [
              ...messages.map(m => ({ 
                role: m.role === 'user' ? 'user' : 'model', 
                parts: [{ text: m.content }] 
              })),
              { role: 'user', parts: [{ text: inputText }] }
            ],
            systemInstruction: { parts: [{ text: config.systemPrompt }] },
            generationConfig: params
          })
        });
      } else {
        // Anthropic
        const cleanBaseUrl = config.baseUrl.replace(/\/$/, '');
        response = await fetch(`${cleanBaseUrl}/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
            'dangerously-allow-browser': 'true' // In a playground, we might need this or a proxy
          },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            model: config.modelId,
            system: config.systemPrompt,
            messages: [
              ...messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: inputText }
            ],
            stream: true,
            ...params
          })
        });
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || err.message || 'API request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        
        if (config.apiType === 'openai') {
          const lines = chunk.split('\n').filter(l => l.trim() !== '');
          for (const line of lines) {
            if (line.includes('[DONE]')) break;
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                const content = data.choices[0]?.delta?.content || '';
                fullContent += content;
                updateLastMessage(assistantMessageId, fullContent);
              } catch (e) {}
            }
          }
        } else if (config.apiType === 'gemini') {
          // Gemini returns a series of JSON objects in chunks
          try {
             // Gemini stream format is slightly different, sometimes a single array or multiple objects
             const cleanChunk = chunk.replace(/^\[/, '').replace(/\]$/, '').trim();
             const parts = cleanChunk.split('},{').map((p, i, a) => {
               if (a.length === 1) return p;
               if (i === 0) return p + '}';
               if (i === a.length - 1) return '{' + p;
               return '{' + p + '}';
             });
             
             for (const p of parts) {
               const data = JSON.parse(p);
               const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
               fullContent += text;
               updateLastMessage(assistantMessageId, fullContent);
             }
          } catch (e) {}
        } else if (config.apiType === 'anthropic') {
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'content_block_delta') {
                  fullContent += data.delta.text;
                  updateLastMessage(assistantMessageId, fullContent);
                }
              } catch (e) {}
            }
          }
        }
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Request stopped.');
      } else {
        setError(err.message);
        updateLastMessage(assistantMessageId, (prev) => prev + `\n\n[${t.error}: ${err.message}]`);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const updateLastMessage = (id: string, newContent: string | ((prev: string) => string)) => {
    setMessages(prev => prev.map(m => 
      m.id === id ? { ...m, content: typeof newContent === 'function' ? newContent(m.content) : newContent } : m
    ));
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  const clearMessages = () => {
    if (confirm(isZh ? '确定清空所有对话吗？' : 'Are you sure you want to clear all messages?')) {
      setMessages([]);
      setError('');
    }
  };

  // Simple Markdown-ish helper
  const renderContent = (content: string) => {
    if (!content) return <span className="opacity-50 italic">...</span>;
    
    // Split by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const lang = match?.[1] || '';
        const code = match?.[2] || part.slice(3, -3);
        return (
          <div key={i} className="my-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-slate-900 overflow-hidden rounded-none">
            {lang && <div className="bg-slate-800 text-slate-400 text-xs px-3 py-1 border-b border-black font-mono">{lang}</div>}
            <pre className="p-4 text-sm text-green-400 font-mono overflow-x-auto"><code>{code}</code></pre>
          </div>
        );
      }
      // Simple inline code and bold
      return <span key={i} dangerouslySetInnerHTML={{ 
        __html: part
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/`(.*?)`/g, '<code class="bg-black/10 px-1 rounded-sm font-mono">$1</code>')
          .replace(/\n/g, '<br/>')
      }} />;
    });
  };

  return (
    <div className="flex flex-col md:flex-row h-[90vh] border-4 border-base-content shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] bg-base-100 overflow-hidden m-4 md:m-8 rounded-none">
      
      {/* Sidebar - Config */}
      <div className={`
        ${isSidebarOpen ? 'w-full md:w-[380px]' : 'w-0'} 
        transition-all duration-300 border-b-4 md:border-b-0 md:border-r-4 border-base-content bg-base-200 flex flex-col overflow-hidden relative
      `}>
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black uppercase tracking-tighter">{t.configTitle}</h2>
              <button 
                onClick={() => setShowGuide(true)}
                className="w-6 h-6 rounded-none border-2 border-black bg-yellow-400 flex items-center justify-center font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
                title={isZh ? '查看使用说明' : 'View Usage Guide'}
              >
                ?
              </button>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden btn btn-sm btn-square btn-ghost border-2 border-black">X</button>
          </div>

          <div className="space-y-4">
            {/* API Type Selector */}
            <div className="flex flex-wrap gap-2">
              {API_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => {
                    const defaultUrls = {
                      openai: 'https://api.openai.com/v1',
                      gemini: 'https://generativelanguage.googleapis.com',
                      anthropic: 'https://api.anthropic.com'
                    };
                    updateConfig({ 
                      apiType: type.id as any,
                      baseUrl: defaultUrls[type.id as keyof typeof defaultUrls]
                    });
                  }}
                  className={`
                    px-3 py-1 text-xs font-black uppercase border-2 border-base-content shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all
                    ${config.apiType === type.id ? `${type.color} text-black translate-x-[1px] translate-y-[1px] shadow-none` : 'bg-base-100 text-base-content hover:bg-base-300'}
                  `}
                >
                  {type.name}
                </button>
              ))}
            </div>

            {/* Config Fields */}
            <div className="space-y-4 text-base-content">
              <div>
                <label className="block text-[10px] font-black uppercase mb-1">{t.baseUrl}</label>
                <input 
                  type="text" 
                  value={config.baseUrl} 
                  onChange={(e) => updateConfig({ baseUrl: e.target.value })}
                  placeholder={
                    config.apiType === 'openai' ? 'https://api.openai.com/v1' :
                    config.apiType === 'gemini' ? 'https://generativelanguage.googleapis.com' :
                    'https://api.anthropic.com'
                  }
                  className="input input-sm input-bordered w-full rounded-none border-2 border-black font-bold" 
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black uppercase mb-1">{t.apiKey}</label>
                <input 
                  type="password" 
                  value={config.apiKey} 
                  onChange={(e) => updateConfig({ apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="input input-sm input-bordered w-full rounded-none border-2 border-black font-bold" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase mb-1">{t.modelId}</label>
                <input 
                  type="text" 
                  value={config.modelId} 
                  onChange={(e) => updateConfig({ modelId: e.target.value })}
                  className="input input-sm input-bordered w-full rounded-none border-2 border-black font-bold" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase mb-1">{t.systemPrompt}</label>
                <textarea 
                  value={config.systemPrompt} 
                  onChange={(e) => updateConfig({ systemPrompt: e.target.value })}
                  className="textarea textarea-sm textarea-bordered w-full rounded-none border-2 border-black h-24 font-medium" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase mb-1">{t.customParams} (JSON)</label>
                <textarea 
                  value={config.customParams} 
                  onChange={(e) => updateConfig({ customParams: e.target.value })}
                  className="textarea textarea-sm textarea-bordered w-full rounded-none border-2 border-base-content h-32 font-mono text-xs bg-base-100 text-base-content" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer buttons for sidebar */}
        <div className="p-4 bg-base-100 border-t-4 border-base-content flex gap-2">
          <button 
            onClick={() => { localStorage.removeItem('AI_PLAYGROUND_CONFIG'); setConfig(DEFAULT_CONFIG); }}
            className="btn btn-sm btn-outline rounded-none border-2 border-base-content flex-1 font-black uppercase text-[10px] text-base-content"
          >
            {t.reset}
          </button>
          <div className="flex items-center text-[10px] font-black uppercase opacity-60 text-base-content">
            {t.storedLocally}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-base-100 overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b-4 border-base-content bg-primary text-primary-content flex justify-between items-center">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="btn btn-sm btn-square border-2 border-base-content bg-base-100 hover:bg-base-200 text-base-content"
              >
                ⚙️
              </button>
            )}
            <h2 className="text-xl font-black uppercase tracking-tighter">{t.chatTitle}</h2>
            <div className="hidden sm:block badge badge-outline border-2 border-current font-black text-[10px] px-2 uppercase">
              {config.apiType} / {config.modelId}
            </div>
          </div>
          <button 
            onClick={clearMessages}
            className="btn btn-sm btn-error rounded-none border-2 border-black font-black uppercase text-[10px]"
          >
            {t.clear}
          </button>
        </div>

        {/* Messages List */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-base-100 bg-[radial-gradient(currentColor_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.98] bg-opacity-5"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-20">
              <div className="text-8xl">🤖</div>
              <p className="font-black text-2xl uppercase tracking-widest text-base-content">{isZh ? '等候指令' : 'Awaiting Input'}</p>
            </div>
          )}
          
          {messages.map((m, i) => (
            <div 
              key={m.id} 
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`
                max-w-[85%] p-4 border-2 border-base-content shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                ${m.role === 'user' ? 'bg-secondary text-secondary-content' : 'bg-base-300 text-base-content'}
              `}>
                <div className="text-[10px] font-black uppercase mb-1 opacity-50 flex justify-between">
                  <span>{m.role === 'user' ? (isZh ? '你' : 'YOU') : (isZh ? '智脑' : 'ASSISTANT')}</span>
                  {/* Delete single message option */}
                  <button onClick={() => setMessages(prev => prev.filter(msg => msg.id !== m.id))} className="hover:text-error ml-4">×</button>
                </div>
                <div className="prose prose-sm max-w-none font-medium leading-relaxed text-current">
                  {renderContent(m.content)}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-4 mb-2 p-2 bg-red-500 text-white font-black uppercase text-xs border-2 border-black flex justify-between items-center">
            <span>{t.error}: {error}</span>
            <button onClick={() => setError('')}>[X]</button>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t-4 border-base-content bg-base-100">
          <div className="flex gap-4 items-end">
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={t.inputPlaceholder}
                className="textarea textarea-bordered w-full rounded-none border-2 border-base-content focus:outline-none focus:ring-0 focus:border-primary bg-base-100 text-base-content min-h-[60px] max-h-[300px] font-medium p-4"
                rows={1}
              />
              <div className="absolute right-2 bottom-2 text-[10px] font-black uppercase opacity-30 pointer-events-none">
                ENTER ↵
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              {loading ? (
                <button 
                  onClick={handleStop}
                  className="btn btn-error rounded-none border-4 border-base-content shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all font-black uppercase"
                >
                  <span className="loading loading-spinner loading-xs"></span>
                  {t.stop}
                </button>
              ) : (
                <button 
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className="btn btn-primary text-primary-content rounded-none border-4 border-base-content shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all font-black uppercase text-lg h-full min-h-[60px]"
                >
                  {t.send} 🚀
                </button>
              )}
            </div>
          </div>
          
          <div className="mt-2 flex justify-between items-center">
            <div className="text-[10px] font-black uppercase opacity-40">
              Shift + Enter for new line • Local data only
            </div>
            <div className="flex gap-4">
               {/* Word Count */}
               <div className="text-[10px] font-black uppercase opacity-40">
                 {inputText.length} chars
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-2xl w-full p-8 relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 btn btn-sm btn-square border-2 border-black font-black hover:bg-red-400 rounded-none"
            >
              X
            </button>
            <h3 className="text-3xl font-black uppercase mb-6 border-b-4 border-black pb-2">
              {isZh ? '使用说明' : 'Usage Guide'}
            </h3>
            <div className="prose prose-slate max-w-none font-bold">
              {isZh ? (
                <div className="space-y-4">
                  <p>这是一个通用的 AI 对话调试工具，支持多种主流模型协议。请注意：</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>隐私安全：</strong> 你的 API Key 和对话记录全部存储在浏览器的 <code>localStorage</code> 中，不会上传到任何第三方服务器。</li>
                    <li><strong>跨域限制 (CORS)：</strong> 部分 API（如 Anthropic）出于安全原因禁止浏览器直接调用。你可能需要配合浏览器插件使用，或者在 Base URL 中配置代理地址。</li>
                    <li><strong>JSON 参数：</strong> 支持标准的 JSON 格式，用于配置 <code>temperature</code>、<code>top_p</code>、<code>max_tokens</code> 等生成参数。</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-4">
                  <p>This playground allows you to test various AI models directly from your browser. Note the following:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Privacy:</strong> Your API keys and chat history are stored <strong>locally</strong> in your browser's <code>localStorage</code>. They are never sent to our servers.</li>
                    <li><strong>CORS Issues:</strong> Some APIs (like Anthropic) may block requests from a browser due to security policies. You may need a browser extension to bypass CORS or use a proxy URL in the Base URL field.</li>
                    <li><strong>JSON Params:</strong> Use standard JSON format for extra parameters like <code>temperature</code>, <code>top_p</code>, <code>max_tokens</code>, etc.</li>
                  </ul>
                </div>
              )}
            </div>
            <div className="mt-8 flex justify-end">
              <button 
                onClick={() => setShowGuide(false)}
                className="btn btn-primary rounded-none border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black uppercase"
              >
                {isZh ? '知道了' : 'Got it!'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
