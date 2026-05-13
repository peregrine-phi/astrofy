import React, { useState, useEffect } from 'react';

interface Term {
  source: string;
  target: string;
}

interface TM {
  source: string;
  target: string;
}

const LANGUAGES = [
  { name: 'Auto Detect', value: 'auto' },
  { name: 'English', value: 'English' },
  { name: 'Chinese', value: 'Chinese' },
  { name: 'Japanese', value: 'Japanese' },
  { name: 'Korean', value: 'Korean' },
  { name: 'French', value: 'French' },
  { name: 'Spanish', value: 'Spanish' },
  { name: 'German', value: 'German' },
  { name: 'Russian', value: 'Russian' },
  { name: 'Italian', value: 'Italian' },
  { name: 'Portuguese', value: 'Portuguese' },
];

const MODELS = [
  { name: 'Qwen MT Plus (Recommended)', value: 'qwen-mt-plus' },
  { name: 'Qwen MT Flash (Fast)', value: 'qwen-mt-flash' },
  { name: 'Qwen MT Lite', value: 'qwen-mt-lite' },
  { name: 'Qwen MT Turbo', value: 'qwen-mt-turbo' },
];

export default function QwenTranslator({ lang = 'en' }: { lang?: string }) {
  const isZh = lang === 'zh';
  
  const t = {
    title: isZh ? 'Qwen MT 翻译器' : 'Qwen MT Translator',
    subtitle: isZh ? '新野兽派之力 x 阿里通义大模型' : 'Neo-Brutalist Power x Alibaba Cloud AI',
    apiKeyLabel: isZh ? 'DashScope API 密钥' : 'DashScope API Key',
    storedLocally: isZh ? '本地存储' : 'Stored Locally',
    typePlaceholder: isZh ? '在此输入文本...' : 'Type your text here...',
    transPlaceholder: isZh ? '翻译结果将显示在此...' : 'Translation will appear here...',
    btnTranslate: isZh ? '立即翻译' : 'Translate Now',
    btnTranslating: isZh ? '翻译中...' : 'Translating...',
    btnSettings: isZh ? '高级设置' : 'Advanced Settings',
    btnHideSettings: isZh ? '隐藏设置' : 'Hide Settings',
    advTitle: isZh ? '高级配置' : 'Advanced Configuration',
    modelLabel: isZh ? '模型' : 'Model',
    streamLabel: isZh ? '开启流式输出' : 'Enable Streaming',
    domainLabel: isZh ? '领域提示 (例如 "IT领域", "法律")' : 'Domain Prompting (e.g., "IT Domain", "Legal")',
    domainPlaceholder: isZh ? '风格引导...' : 'Style guidance...',
    termsTitle: isZh ? '术语干预' : 'Term Intervention',
    tmTitle: isZh ? '翻译记忆' : 'Translation Memory',
    addTerm: isZh ? '+ 添加术语' : '+ Add Term',
    addTM: isZh ? '+ 添加对' : '+ Add Pair',
    sourceLabel: isZh ? '原文' : 'Source',
    targetLabel: isZh ? '译文' : 'Target',
    seedLabel: isZh ? '随机种子' : 'Seed',
  };

  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('English');
  const [model, setModel] = useState('qwen-mt-plus');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Advanced Options
  const [domain, setDomain] = useState('');
  const [terms, setTerms] = useState<Term[]>([]);
  const [tmList, setTmList] = useState<TM[]>([]);
  const [temperature, setTemperature] = useState(0.65);
  const [topP, setTopP] = useState(0.8);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [repetitionPenalty, setRepetitionPenalty] = useState(1.0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('DASHSCOPE_API_KEY');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('DASHSCOPE_API_KEY', key);
  };

  const handleTranslate = async () => {
    if (!apiKey) {
      setError('Please enter your DashScope API Key.');
      return;
    }
    if (!sourceText) return;

    setLoading(true);
    setError('');
    setTranslatedText('');

    try {
      const response = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: sourceText }],
          stream: isStreaming,
          temperature,
          top_p: topP,
          seed,
          repetition_penalty: repetitionPenalty,
          translation_options: {
            source_lang: sourceLang,
            target_lang: targetLang,
            domains: domain || undefined,
            terms: terms.length > 0 ? terms : undefined,
            tm_list: tmList.length > 0 ? tmList : undefined,
          }
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Translation failed');
      }

      if (isStreaming) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let currentTranslation = '';

        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (dataStr === '[DONE]') break;
              try {
                const data = JSON.parse(dataStr);
                const content = data.choices[0]?.delta?.content || '';
                // Qwen-MT Plus/Turbo are non-incremental in stream? 
                // Documentation says qwen-mt-flash/lite are incremental, plus/turbo non-incremental.
                if (model === 'qwen-mt-plus' || model === 'qwen-mt-turbo') {
                  currentTranslation = content;
                } else {
                  currentTranslation += content;
                }
                setTranslatedText(currentTranslation);
              } catch (e) {
                console.error('Error parsing stream chunk', e);
              }
            }
          }
        }
      } else {
        const data = await response.json();
        setTranslatedText(data.choices[0].message.content);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addTerm = () => setTerms([...terms, { source: '', target: '' }]);
  const updateTerm = (index: number, field: keyof Term, value: string) => {
    const newTerms = [...terms];
    newTerms[index][field] = value;
    setTerms(newTerms);
  };
  const removeTerm = (index: number) => setTerms(terms.filter((_, i) => i !== index));

  const addTM = () => setTmList([...tmList, { source: '', target: '' }]);
  const updateTM = (index: number, field: keyof TM, value: string) => {
    const newTM = [...tmList];
    newTM[index][field] = value;
    setTmList(newTM);
  };
  const removeTM = (index: number) => setTmList(tmList.filter((_, i) => i !== index));

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-accent p-6 rounded-none">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-accent-content">{t.title}</h1>
        <p className="font-bold text-accent-content/80 mt-2">{t.subtitle}</p>
      </div>

      {/* API Key Section */}
      <div className="border-2 md:border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-base-100 p-6 rounded-none">
        <label className="block text-sm font-black uppercase mb-2">{t.apiKeyLabel}</label>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => saveApiKey(e.target.value)}
            placeholder="sk-..."
            className="input input-bordered w-full rounded-none border-2 border-black focus:outline-none focus:ring-0 focus:border-primary"
          />
          <div className="p-2 border-2 border-black bg-base-200 font-bold uppercase text-xs flex items-center">
            {t.storedLocally}
          </div>
        </div>
      </div>

      {/* Translator Main */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-base-100 rounded-none overflow-hidden">
        {/* Input Side */}
        <div className="p-6 space-y-4 border-b-4 md:border-b-0 md:border-r-4 border-black">
          <select 
            className="select select-bordered w-full rounded-none border-2 border-black font-black uppercase"
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
          >
            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.name}</option>)}
          </select>
          <textarea
            className="textarea textarea-bordered w-full h-64 rounded-none border-2 border-black focus:outline-none focus:ring-0 text-lg font-medium p-4"
            placeholder={t.typePlaceholder}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
          />
        </div>

        {/* Output Side */}
        <div className="p-6 space-y-4 bg-base-200/50">
          <select 
            className="select select-bordered w-full rounded-none border-2 border-black font-black uppercase"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
          >
            {LANGUAGES.filter(l => l.value !== 'auto').map(l => <option key={l.value} value={l.value}>{l.name}</option>)}
          </select>
          <div className="relative group">
            <textarea
              className="textarea textarea-bordered w-full h-64 rounded-none border-2 border-black bg-white focus:outline-none focus:ring-0 text-lg font-medium p-4"
              placeholder={t.transPlaceholder}
              value={translatedText}
              readOnly
            />
            {loading && !isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 border-2 border-black">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <button
          onClick={handleTranslate}
          disabled={loading || !sourceText}
          className="btn btn-primary btn-lg grow rounded-none border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 transition-all text-xl font-black uppercase"
        >
          {loading ? t.btnTranslating : t.btnTranslate}
        </button>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="btn btn-secondary btn-lg rounded-none border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 transition-all font-black uppercase"
        >
          {showAdvanced ? t.btnHideSettings : t.btnSettings}
        </button>
      </div>

      {error && (
        <div className="p-4 border-4 border-black bg-error text-error-content font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          {error}
        </div>
      )}

      {/* Advanced Settings Panel */}
      {showAdvanced && (
        <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-base-100 p-8 space-y-8 rounded-none">
          <h2 className="text-3xl font-black uppercase border-b-4 border-black pb-2 inline-block mb-4">{t.advTitle}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Model & Stream */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black uppercase mb-2">{t.modelLabel}</label>
                <select 
                  className="select select-bordered w-full rounded-none border-2 border-black"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  {MODELS.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                </select>
              </div>
              <div className="form-control border-2 border-black p-4">
                <label className="label cursor-pointer">
                  <span className="label-text font-black uppercase">{t.streamLabel}</span>
                  <input 
                    type="checkbox" 
                    className="checkbox checkbox-primary rounded-none border-2 border-black" 
                    checked={isStreaming}
                    onChange={(e) => setIsStreaming(e.target.checked)}
                  />
                </label>
              </div>
            </div>

            {/* Generation Params */}
            <div className="space-y-4 p-4 border-2 border-black bg-base-200/30">
              <div className="flex justify-between">
                <label className="text-sm font-black uppercase">Temperature: {temperature}</label>
                <input type="range" min="0" max="2" step="0.05" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="range range-primary range-xs" />
              </div>
              <div className="flex justify-between">
                <label className="text-sm font-black uppercase">Top P: {topP}</label>
                <input type="range" min="0" max="1" step="0.05" value={topP} onChange={(e) => setTopP(parseFloat(e.target.value))} className="range range-primary range-xs" />
              </div>
              <div>
                <label className="block text-sm font-black uppercase mb-2">{t.seedLabel}</label>
                <input type="number" value={seed || ''} onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)} className="input input-bordered w-full rounded-none border-2 border-black" />
              </div>
            </div>
          </div>

          <div className="divider before:bg-black after:bg-black"></div>

          {/* Domain & Terms */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-black uppercase mb-2">{t.domainLabel}</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder={t.domainPlaceholder}
                className="input input-bordered w-full rounded-none border-2 border-black"
              />
            </div>

            {/* Term Intervention */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black uppercase">{t.termsTitle}</h3>
                <button onClick={addTerm} className="btn btn-sm btn-outline rounded-none border-2 border-black font-black uppercase">{t.addTerm}</button>
              </div>
              {terms.map((term, i) => (
                <div key={i} className="flex gap-2">
                  <input placeholder={t.sourceLabel} value={term.source} onChange={(e) => updateTerm(i, 'source', e.target.value)} className="input input-bordered input-sm grow rounded-none border-2 border-black" />
                  <input placeholder={t.targetLabel} value={term.target} onChange={(e) => updateTerm(i, 'target', e.target.value)} className="input input-bordered input-sm grow rounded-none border-2 border-black" />
                  <button onClick={() => removeTerm(i)} className="btn btn-sm btn-square btn-error rounded-none border-2 border-black">X</button>
                </div>
              ))}
            </div>

            {/* Translation Memory */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black uppercase">{t.tmTitle}</h3>
                <button onClick={addTM} className="btn btn-sm btn-outline rounded-none border-2 border-black font-black uppercase">{t.addTM}</button>
              </div>
              {tmList.map((tm, i) => (
                <div key={i} className="flex gap-2">
                  <input placeholder={t.sourceLabel} value={tm.source} onChange={(e) => updateTM(i, 'source', e.target.value)} className="input input-bordered input-sm grow rounded-none border-2 border-black" />
                  <input placeholder={t.targetLabel} value={tm.target} onChange={(e) => updateTM(i, 'target', e.target.value)} className="input input-bordered input-sm grow rounded-none border-2 border-black" />
                  <button onClick={() => removeTM(i)} className="btn btn-sm btn-square btn-error rounded-none border-2 border-black">X</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
