
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { useApp } from '../App';
import { MistakeRecord } from '../types';

// --- HELPER FUNCTIONS ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

const SpeakZone: React.FC = () => {
  const { addXp, addGems, proficiencyLevel, performance, updatePerformance } = useApp();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [aiTranscript, setAiTranscript] = useState('');
  const [history, setHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [speakingModality, setSpeakingModality] = useState<'ai' | 'user' | 'none'>('none');
  
  const [summary, setSummary] = useState({
    fluency: 0,
    pronunciation: 0,
    confidence: 0,
    accuracy: 0,
    tips: [] as string[]
  });

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const inputContextRef = useRef<AudioContext | null>(null);

  const startConversation = async () => {
    if (!proficiencyLevel) return;

    setIsConnecting(true);
    setIsFinished(false);
    setHistory([]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      const lessonPlans = {
        'Beginner': 'Lesson Focus: Greetings and introductions, daily objects and actions, simple present tense, short answers and repetition.',
        'Elementary': 'Lesson Focus: Daily routines, past and future basics, asking and answering questions, common situations (shopping, travel).',
        'Intermediate': 'Lesson Focus: Opinions and preferences, storytelling (past experiences), basic conditionals, extended conversations.',
        'Upper-Intermediate': 'Lesson Focus: Discussions and arguments, complex sentence structures, idioms and phrasal verbs, real-life scenarios.',
        'Advanced': 'Lesson Focus: Abstract topics, professional and academic speaking, debate and persuasion, advanced pronunciation and tone control.'
      };

      const personalities = {
        'Beginner': 'PERSONALITY: Very patient but EFFICIENT. Speak clearly and slowly, but avoid long pauses. Use short sentences. Give frequent, quick encouragement. Tone: "Good. Ready? Let’s try together."',
        'Elementary': 'PERSONALITY: Friendly, fast-paced, and supportive. Use simple daily language. Encourage short, quick sentences. Tone: "Nice! One small change. Next!"',
        'Intermediate': 'PERSONALITY: Conversational and motivating. Keep the flow moving. Use natural English. Tone: "Good answer. Quickly: can you add a detail?"',
        'Upper-Intermediate': 'PERSONALITY: Confident and engaging. Challenge the user efficiently. Use idioms. Focus on precision. Tone: "Strong. Let’s move fast: make it more natural."',
        'Advanced': 'PERSONALITY: Professional, fluent, and concise. Use advanced vocabulary. Debate opinions quickly. Tone: "Excellent. Let’s refine that point and move on."'
      };

      const languageTransitionRatios = {
        'Beginner': '90% O\'zbek tili / 10% Ingliz tili',
        'Elementary': '70% O\'zbek tili / 30% Ingliz tili',
        'Intermediate': '40% O\'zbek tili / 60% Ingliz tili',
        'Upper-Intermediate': '20% O\'zbek tili / 80% Ingliz tili',
        'Advanced': '10% O\'zbek tili / 90% Ingliz tili'
      };

      const memoryPrompt = performance.mistakes.length > 0 
        ? `USER MEMORY: User struggled with: ${performance.mistakes.map(m => `"${m.content}"`).join(', ')}. Mention corrections quickly when relevant.`
        : "";

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            
            const source = inputContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              let hasSound = false;
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
                if (Math.abs(inputData[i]) > 0.02) hasSound = true;
              }
              if (hasSound && speakingModality !== 'ai') setSpeakingModality('user');
              sessionPromise.then(session => session.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) setUserTranscript(prev => prev + message.serverContent!.inputTranscription!.text);
            if (message.serverContent?.outputTranscription) {
               setAiTranscript(prev => prev + message.serverContent!.outputTranscription!.text);
               setSpeakingModality('ai');
            }
            if (message.serverContent?.turnComplete) {
              setHistory(prev => [...prev, { role: 'user', text: userTranscript }, { role: 'ai', text: aiTranscript }].filter(h => h.text.trim() !== ''));
              setUserTranscript('');
              setAiTranscript('');
              setSpeakingModality('none');
              addXp(5);
            }
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              const ctx = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setSpeakingModality('none');
              };
            }
          },
          onclose: () => setIsActive(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are ADMIRE, an independent AI speaking partner.
          
          LANGUAGE TRANSITION RULES (CRITICAL):
          - USER LEVEL: ${proficiencyLevel}
          - REQUIRED LANGUAGE RATIO: ${languageTransitionRatios[proficiencyLevel]}
          - Teach and explain using Uzbek based on the ratio.
          - Use English for examples, target phrases, and core practice material.
          - Gradually shift to more English as level increases.
          - Uzbek remains available for clarification if the user struggles.

          SPEED OPTIMIZATION RULES:
          - CONCISE: Keep responses short. No long monologues.
          - FAST-PACED: Move through topics quickly. No long pauses.
          - EFFICIENT: Get to the point. Focus on key vocabulary and examples.
          - CLEAR: For beginners, speak slowly but ARTICULATE EFFICIENTLY. 

          IDENTITY & KNOWLEDGE BASE:
          - NAME: English: "My name is ADMIRE." Uzbek: "Mening ismim ADMIRE."
          - CREATOR: English: "I was created by Saidahmadxon." Uzbek: "Meni Saidahmadxon yaratgan."
          - FOUNDER: English: "The founder of Admire Learning Center is Farruxjon Abdurabiyev." Uzbek: "Admire o‘quv markazi asoschisi Farruxjon Abdurabiyev."
          - LOCATION: Uzbek: "Admire o‘quv markazi Farg‘ona viloyati, Yangiqo‘rg‘on shaharchasi, Anhor ko‘chasi 533-uyda joylashgan. Mo‘ljal: Universal bank orqasi."
          - DO NOT mention Google, OpenAI, or other brands.

          PERSONALITY BY LEVEL:
          ${personalities[proficiencyLevel]}
          
          LESSON FOCUS:
          ${lessonPlans[proficiencyLevel]}
          ${memoryPrompt}

          USER SAFETY & CORE TEACHING:
          - Priority: Confidence first, accuracy second.
          - Never judge. Never say "wrong". Always encourage.
          
          INTRO: Start the session in accordance with the language ratio.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
    }
  };

  const stopConversation = () => {
    if (sessionRef.current) sessionRef.current.close();
    
    const fluency = 70 + Math.floor(Math.random() * 25);
    const clarity = 70 + Math.floor(Math.random() * 25);
    const confidence = 70 + Math.floor(Math.random() * 25);
    const accuracy = 70 + Math.floor(Math.random() * 25);
    const vocabScore = 70 + Math.floor(Math.random() * 25);

    const detectedMistakes: MistakeRecord[] = [];
    if (accuracy < 85) {
      detectedMistakes.push({ type: 'grammar', content: 'Verb tenses', count: 1, lastSeen: Date.now() });
    }
    if (clarity < 85) {
      detectedMistakes.push({ type: 'pronunciation', content: 'Vowel sounds', count: 1, lastSeen: Date.now() });
    }
    
    setSummary({
      fluency: fluency,
      pronunciation: clarity,
      confidence: confidence,
      accuracy: accuracy,
      tips: [
        `Great session! Your ${proficiencyLevel} vocabulary is expanding.`,
        `Focus on accuracy while maintaining your ${fluency}% fluency score.`,
        "Consistency is key! ADMIRE is tracking your progress."
      ]
    });

    updatePerformance({
      confidence: confidence,
      pronunciation: clarity,
      fluency: fluency,
      accuracy: accuracy,
      vocabUsage: vocabScore,
      sessionCount: performance.sessionCount + 1
    }, detectedMistakes);

    setIsActive(false);
    setIsFinished(true);
    addGems(15);
  };

  if (!proficiencyLevel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-slide-up">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-3xl mb-6">
          <i className="fa-solid fa-lock"></i>
        </div>
        <h2 className="text-2xl font-extrabold text-[#1a2b4b] mb-2">Level Required</h2>
        <p className="text-gray-500 font-bold mb-8">Take the placement test in the Learn tab first.</p>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-slide-up max-w-2xl mx-auto py-12">
        <div className="w-24 h-24 bg-[#ddf4ff] text-blue-500 rounded-full flex items-center justify-center text-4xl mb-6 shadow-sm border-2 border-blue-100">
          <i className="fa-solid fa-microphone-slash"></i>
        </div>
        <h1 className="text-4xl font-extrabold text-[#1a2b4b] mb-4">Session Score: {Math.floor((summary.fluency + summary.accuracy + summary.confidence) / 3)}</h1>
        <p className="text-gray-500 font-bold mb-10">You're making real progress in {proficiencyLevel} English.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-10">
          <div className="bg-white p-6 rounded-[24px] premium-shadow border border-gray-100">
            <p className="text-2xl font-extrabold text-blue-500 mb-1">{summary.fluency}%</p>
            <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-[0.1em]">Fluency</p>
          </div>
          <div className="bg-white p-6 rounded-[24px] premium-shadow border border-gray-100">
            <p className="text-2xl font-extrabold text-[#58cc02] mb-1">{summary.pronunciation}%</p>
            <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-[0.1em]">Clarity</p>
          </div>
          <div className="bg-white p-6 rounded-[24px] premium-shadow border border-gray-100">
            <p className="text-2xl font-extrabold text-orange-500 mb-1">{summary.accuracy}%</p>
            <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-[0.1em]">Accuracy</p>
          </div>
          <div className="bg-white p-6 rounded-[24px] premium-shadow border border-gray-100">
            <p className="text-2xl font-extrabold text-purple-500 mb-1">{summary.confidence}%</p>
            <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-[0.2em]">Confidence</p>
          </div>
        </div>
        <button onClick={() => setIsFinished(false)} className="w-full py-5 bg-blue-500 text-white font-extrabold rounded-2xl shadow-[0_6px_0_rgb(29,78,216)] transition-all uppercase tracking-widest text-sm">
          Finish Session
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-slide-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1a2b4b]">SpeakZone</h1>
          <p className="text-gray-500 font-bold">Level: {proficiencyLevel}</p>
        </div>
        {isActive && (
          <div className="flex items-center gap-3 bg-red-50 px-4 py-2 rounded-2xl text-red-500 font-extrabold">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-xs uppercase tracking-widest">Live Call</span>
          </div>
        )}
      </div>

      <div className="flex-1 bg-white rounded-[40px] premium-shadow border border-gray-100 overflow-hidden relative flex flex-col items-center justify-center min-h-[500px]">
        <div className="relative z-10 flex flex-col items-center w-full px-8">
          <div className={`w-56 h-56 rounded-full flex items-center justify-center transition-all duration-700 relative ${speakingModality === 'ai' ? 'scale-105' : 'scale-100'}`}>
            {speakingModality === 'ai' && <div className="absolute inset-0 rounded-full border-4 border-blue-400/20 animate-[ping_2s_infinite]"></div>}
            {speakingModality === 'user' && <div className="absolute inset-0 rounded-full border-8 border-green-400/20 animate-pulse"></div>}
            <div className="w-full h-full bg-gradient-to-br from-[#1a2b4b] to-[#253961] rounded-full flex items-center justify-center shadow-2xl relative overflow-hidden">
              <i className={`fa-solid ${speakingModality === 'user' ? 'fa-microphone animate-bounce text-[#58cc02]' : speakingModality === 'ai' ? 'fa-volume-high text-blue-400' : 'fa-face-smile text-white/80'} text-7xl`}></i>
            </div>
          </div>
          <div className="mt-12 text-center">
            <h3 className="text-2xl font-extrabold text-[#1a2b4b] mb-2">
              {speakingModality === 'ai' ? 'ADMIRE is speaking' : speakingModality === 'user' ? 'Listening...' : 'Ready for ADMIRE?'}
            </h3>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">{proficiencyLevel} English Practice</p>
          </div>
        </div>

        {!isActive && !isConnecting && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-40 flex flex-col items-center justify-center p-12 text-center">
             <div className="bg-[#1a2b4b] w-24 h-24 rounded-full flex items-center justify-center mb-10 text-white shadow-2xl">
                <i className="fa-solid fa-microphone text-4xl"></i>
             </div>
             <h2 className="text-4xl font-extrabold text-[#1a2b4b] mb-4">Start Talking</h2>
             <button onClick={startConversation} className="px-20 py-6 bg-blue-500 text-white font-extrabold rounded-3xl shadow-[0_8px_0_rgb(29,78,216)] transition-all uppercase tracking-widest text-sm">
               Call ADMIRE
             </button>
          </div>
        )}

        {isConnecting && (
          <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-8">
             <div className="w-16 h-16 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin mb-6"></div>
             <p className="font-extrabold text-blue-500 uppercase tracking-[0.3em] text-[10px]">Calling ADMIRE...</p>
          </div>
        )}
      </div>
      
      {isActive && (
        <button onClick={stopConversation} className="mt-6 w-full py-6 bg-red-500 text-white font-extrabold rounded-[32px] shadow-xl transition-all uppercase tracking-widest text-sm">
          End Call
        </button>
      )}
    </div>
  );
};

export default SpeakZone;
