
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useApp } from '../App';
import { ProficiencyLevel } from '../types';

// --- AUDIO HELPERS (Optimized for PCM) ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const LearnDashboard: React.FC = () => {
  const { addXp, proficiencyLevel, setProficiencyLevel } = useApp();
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [lessonMode, setLessonMode] = useState<'EXPLANATION' | 'PRACTICE' | 'RESULT'>('EXPLANATION');
  const [testStep, setTestStep] = useState<number | null>(null);
  const [testScores, setTestScores] = useState<number[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentAnswers, setCurrentAnswers] = useState<number[]>([]);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  /**
   * ROUND UP 1 - UNIT START RULE
   * Logic: Uzbek explanations -> English examples.
   */
  const beginnerPDFUnits = [
    {
      unit: 1,
      title: "Unit 1: Articles (a, an, the)",
      videoText: "Salom! Men ADMIRE-man, sizning o'qituvchingizman. Biz Round Up 1 darslarini boshlaymiz. 1-unit Artikllar haqida. Biz 'a' artiklini undosh harflar bilan boshlanadigan so'zlar oldidan ishlatamiz, masalan: 'a pen'. 'an' artiklini esa unli harflar oldidan ishlatamiz, masalan: 'an apple'. 'The' artikli aniq bir narsani ko'rsatish uchun ishlatiladi. Doskaga qarang va qoidalarni tinglang.",
      simpleExplanation: "Artikllar juda oson. 'a', 'an' va 'the' kabi qisqa so'zlar. Undosh tovushlar bilan boshlanadigan so'zlar uchun 'a' (a cat), unli tovushlar uchun esa 'an' (an orange) ishlating. Biz bilgan aniq narsalar uchun 'the' ishlatiladi.",
      board: {
        keywords: ["a", "an", "the", "Articles"],
        sentences: ["This is a book.", "She has an orange.", "The sun is hot."],
        examples: ["a + b, c, d...", "an + a, e, i, o, u", "the + unique things"]
      },
      exercises: [
        { q: "To'g'ri artiklni tanlang: ___ elephant", options: ["a", "an", "the"], correct: 1 },
        { q: "___ table is big. (shu yerdagi aniq stol)", options: ["a", "an", "the"], correct: 2 },
        { q: "I have ___ cat.", options: ["a", "an", "the"], correct: 0 }
      ]
    },
    {
      unit: 2,
      title: "Unit 2: Plurals",
      videoText: "Endi 2-unit: Plurals ya'ni ko'plik. Ingliz tilida narsalar ko'p bo'lsa, odatda so'z oxiriga 's' harfini qo'shamiz. Masalan: bitta kitob (one book), ikkita kitob (two books). Ba'zi so'zlarga 'es' qo'shiladi. Doskadagi namunalarga diqqat qiling.",
      simpleExplanation: "Ko'plik shakli juda oddiy. So'z oxiriga 's' qo'shing. Dog (it) - dogs (itlar). Box (quti) - boxes (qutilar). Doskaga qarang.",
      board: {
        keywords: ["One", "Many", "s / es"],
        sentences: ["I like cats.", "Three boxes are here.", "Look at the stars."],
        examples: ["Apple -> Apples", "Bus -> Buses", "Baby -> Babies"]
      },
      exercises: [
        { q: " 'Apple' so'zining ko'pligi?", options: ["apples", "applees", "appleies"], correct: 0 },
        { q: " 'Dish' so'zining ko'pligi?", options: ["dishs", "dishes", "dishies"], correct: 1 },
        { q: "I have four ___ (car).", options: ["car", "cars", "caries"], correct: 1 }
      ]
    }
  ];

  const placementQuestions = [
    { q: "___ orange is on the table.", options: ["a", "an", "the"], correct: 1 },
    { q: " 'Watch' so'zining ko'pligi?", options: ["watchs", "watches", "watchies"], correct: 1 },
    { q: "___ is my sister.", options: ["He", "She", "It"], correct: 1 },
    { q: "I ___ a student.", options: ["am", "is", "are"], correct: 0 },
    { q: "They ___ playing.", options: ["is", "am", "are"], correct: 2 }
  ];

  useEffect(() => {
    if (selectedLesson !== null && lessonMode === 'EXPLANATION') {
      const lesson = beginnerPDFUnits[selectedLesson];
      const textToSpeak = isRepeat ? lesson.simpleExplanation : lesson.videoText;
      playTeacherVoice(textToSpeak);
    } else {
      stopTeacherVoice();
    }
    return () => stopTeacherVoice();
  }, [selectedLesson, lessonMode, isRepeat]);

  const stopTeacherVoice = () => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {}
      currentSourceRef.current = null;
    }
    setIsSpeaking(false);
  };

  const playTeacherVoice = async (text: string) => {
    try {
      stopTeacherVoice();
      setIsSpeaking(true);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      // Dynamic Language Ratios based on current level
      const ratios: Record<string, string> = {
        'Beginner': '90% O\'zbekcha / 10% Inglizcha',
        'Elementary': '70% O\'zbekcha / 30% Inglizcha',
        'Intermediate': '40% O\'zbekcha / 60% Inglizcha',
        'Upper-Intermediate': '20% O\'zbekcha / 80% Inglizcha',
        'Advanced': '10% O\'zbekcha / 90% Inglizcha'
      };

      const currentRatio = ratios[proficiencyLevel || 'Beginner'];

      // STEP 1: Generate the exact script to speak using gemini-3-flash-preview
      const scriptResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Siz ADMIRE ismli, professional o'qituvchisiz. 
        FOYDALANUVCHI DARAJASI: ${proficiencyLevel}.
        TIL QOIDASI: Tushuntirishlar uchun ${currentRatio} nisbatida gapiring.
        DARSLIK MATNI: "${text}".
        
        Ko'rsatma: Mavzuni juda tushunarli qilib, belgilangan til nisbatida so'zlab bering. 
        O'zbek tilidagi tushuntirishlar tushunarli va ravon bo'lishi shart. 
        Ingliz tili faqat misollar va qisqa iboralar uchun ishlatilsin.
        FAQAT gapirilishi kerak bo'lgan matnni qaytaring, ortiqcha izohsiz.`,
      });

      const scriptToSpeak = scriptResponse.text || text;

      // STEP 2: Convert that plain script into audio using gemini-2.5-flash-preview-tts
      const ttsResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ 
          parts: [{ 
            text: scriptToSpeak 
          }] 
        }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();
        
        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => {
          if (currentSourceRef.current === source) {
            setIsSpeaking(false);
          }
        };
        currentSourceRef.current = source;
        source.start(0);
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error("Teacher voice failed:", error);
      setIsSpeaking(false);
    }
  };

  const handleTestAnswer = (index: number) => {
    if (testStep === null) return;
    const isCorrect = index === placementQuestions[testStep].correct;
    const newScores = [...testScores, isCorrect ? 100 : 0];
    setTestScores(newScores);

    if (testStep < placementQuestions.length - 1) {
      setTestStep(testStep + 1);
    } else {
      setIsEvaluating(true);
      setTimeout(() => {
        const average = newScores.reduce((a, b) => a + b, 0) / newScores.length;
        if (average >= 70) setProficiencyLevel('Elementary');
        else setProficiencyLevel('Beginner');
        setTestStep(null);
        setIsEvaluating(false);
        addXp(50);
      }, 1500);
    }
  };

  const handleStartLesson = (idx: number) => {
    if (idx > 0 && !localStorage.getItem(`roundup_unit_${idx - 1}_passed`)) return;
    setSelectedLesson(idx);
    setLessonMode('EXPLANATION');
    setIsRepeat(false);
    setCurrentAnswers([]);
  };

  const processResult = () => {
    const score = calculateScore();
    if (score >= 100) { 
      localStorage.setItem(`roundup_unit_${selectedLesson}_passed`, 'true');
      addXp(30);
      const nextIdx = selectedLesson! + 1;
      if (nextIdx < beginnerPDFUnits.length) {
        setSelectedLesson(nextIdx);
        setLessonMode('EXPLANATION');
        setIsRepeat(false);
        setCurrentAnswers([]);
      } else {
        setSelectedLesson(null);
      }
    } else {
      setIsRepeat(true);
      setLessonMode('EXPLANATION');
      setCurrentAnswers([]);
    }
  };

  const calculateScore = () => {
    const lesson = beginnerPDFUnits[selectedLesson!];
    let correctCount = 0;
    currentAnswers.forEach((ans, idx) => {
      if (ans === lesson.exercises[idx].correct) correctCount++;
    });
    return Math.round((correctCount / lesson.exercises.length) * 100);
  };

  if (!proficiencyLevel) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 animate-slide-up">
        {testStep === null ? (
          <div className="text-center bg-white p-12 rounded-[40px] shadow-xl border-2 border-blue-50">
            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-8">
              <i className="fa-solid fa-graduation-cap"></i>
            </div>
            <h1 className="text-4xl font-extrabold text-[#1a2b4b] mb-4">Round Up Evaluation</h1>
            <p className="text-gray-500 font-bold mb-10 leading-relaxed">
              Elementary darajasidan boshlashingizni yoki Round Up 1-unitidan boshlashingizni aniqlaymiz.
            </p>
            <button onClick={() => { setTestStep(0); setTestScores([]); }} className="w-full py-5 bg-blue-500 text-white font-extrabold rounded-2xl shadow-[0_6px_0_rgb(29,78,216)] active:translate-y-[6px] transition-all uppercase tracking-widest text-sm">
              Testni boshlash
            </button>
          </div>
        ) : isEvaluating ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mx-auto mb-8"></div>
            <h2 className="text-2xl font-extrabold text-[#1a2b4b]">Darajani aniqlayapman...</h2>
          </div>
        ) : (
          <div className="bg-white p-10 rounded-[40px] shadow-xl border border-gray-100">
             <div className="flex justify-between items-center mb-10">
                <span className="text-xs font-extrabold text-blue-500 uppercase tracking-widest">{testStep + 1}-savol, jami {placementQuestions.length}</span>
                <div className="h-2 w-32 bg-gray-100 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${((testStep + 1) / placementQuestions.length) * 100}%` }}></div>
                </div>
             </div>
             <h2 className="text-2xl font-extrabold text-[#1a2b4b] mb-8">{placementQuestions[testStep].q}</h2>
             <div className="space-y-4">
               {placementQuestions[testStep].options.map((opt, i) => (
                 <button key={i} onClick={() => handleTestAnswer(i)} className="w-full text-left p-5 rounded-2xl border-2 border-gray-100 hover:border-blue-400 hover:bg-blue-50 font-bold text-[#4b4b4b] transition-all flex items-center gap-4">
                    <span className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 font-extrabold text-sm">{i + 1}</span>
                    {opt}
                 </button>
               ))}
             </div>
          </div>
        )}
      </div>
    );
  }

  const currentUnit = selectedLesson !== null ? beginnerPDFUnits[selectedLesson] : null;

  return (
    <div className="animate-fade-in pb-20 max-w-4xl mx-auto">
      {selectedLesson === null ? (
        <div className="space-y-12">
          <div className="bg-[#58cc02] p-10 rounded-[40px] text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <span className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">O'quv yo'li</span>
              <h2 className="text-4xl font-black mb-3 italic">Round Up 1</h2>
              <p className="text-white/80 font-bold max-w-sm">Ingliz tili grammatikasini 1-unit Artikllardan boshlab o'rganamiz.</p>
            </div>
            <i className="fa-solid fa-book-sparkles absolute top-10 right-10 text-9xl opacity-20 rotate-12"></i>
          </div>

          <div className="flex flex-col items-center space-y-12 relative py-10">
            <div className="absolute top-0 bottom-0 w-2 bg-gray-100 rounded-full -z-10"></div>
            {beginnerPDFUnits.map((unit, idx) => {
              const isPassed = !!localStorage.getItem(`roundup_unit_${idx}_passed`);
              const isLocked = idx > 0 && !localStorage.getItem(`roundup_unit_${idx - 1}_passed`);
              const isCurrent = (idx === 0 && !isPassed) || (idx > 0 && !isPassed && localStorage.getItem(`roundup_unit_${idx - 1}_passed`));

              return (
                <div key={idx} className="relative flex flex-col items-center">
                   <button 
                    onClick={() => handleStartLesson(idx)}
                    disabled={isLocked}
                    className={`w-28 h-28 rounded-full border-b-[8px] flex flex-col items-center justify-center transition-all relative ${
                      isLocked 
                      ? 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed' 
                      : isPassed 
                        ? 'bg-[#58cc02] border-[#46a302] text-white shadow-lg' 
                        : isCurrent 
                          ? 'bg-blue-500 border-blue-700 text-white shadow-2xl scale-125 z-10 ring-8 ring-blue-50' 
                          : 'bg-blue-400 border-blue-600 text-white'
                    }`}
                  >
                    {isLocked ? <i className="fa-solid fa-lock text-3xl"></i> : isPassed ? <i className="fa-solid fa-check text-4xl"></i> : <i className="fa-solid fa-book-open text-3xl"></i>}
                    <span className="text-[10px] font-black mt-1 uppercase">{unit.unit}-Unit</span>
                  </button>
                  {isCurrent && (
                    <div className="absolute -bottom-14 bg-[#1a2b4b] text-white px-4 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest animate-bounce whitespace-nowrap">
                      Shu yerdan boshlang
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col overflow-y-auto">
          <div className="max-w-4xl mx-auto w-full p-6 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <button onClick={() => setSelectedLesson(null)} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-xmark text-2xl"></i></button>
              <div className="flex-1 mx-10 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: lessonMode === 'EXPLANATION' ? '40%' : lessonMode === 'PRACTICE' ? '80%' : '100%' }}></div>
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{currentUnit?.unit}-Unit</span>
            </div>

            {lessonMode === 'EXPLANATION' && currentUnit && (
              <div className="animate-slide-up flex flex-col flex-1">
                 <div className="flex flex-col items-center text-center mb-10">
                    <div className={`w-28 h-28 bg-[#1a2b4b] rounded-full flex items-center justify-center text-white text-5xl mb-6 shadow-2xl transition-all duration-500 border-4 border-blue-50 ${isSpeaking ? 'scale-110 shadow-blue-200' : ''}`}>
                      {isSpeaking && <div className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-ping"></div>}
                      <i className={`fa-solid ${isSpeaking ? 'fa-microphone-lines' : 'fa-chalkboard-user'}`}></i>
                    </div>
                    <h2 className="text-3xl font-black text-[#1a2b4b] italic mb-2">{currentUnit.title}</h2>
                    <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.3em]">{isSpeaking ? "ADMIRE tushuntirmoqda..." : "Tushuntirish darsi"}</p>
                 </div>

                 <div className="bg-[#1e293b] p-8 md:p-12 rounded-[48px] border-[12px] border-[#334155] text-white font-mono shadow-2xl mb-10 min-h-[300px] flex flex-col justify-center relative">
                    <div className="absolute top-4 right-8 text-[10px] text-white/20 uppercase font-black tracking-widest">Admire Doskasi</div>
                    <div className="space-y-8">
                       <div>
                          <p className="text-blue-400 text-[10px] font-black uppercase mb-3 tracking-widest">Lug'at</p>
                          <div className="flex flex-wrap gap-2.5">
                             {currentUnit.board.keywords.map(k => <span key={k} className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold">{k}</span>)}
                          </div>
                       </div>
                       <div>
                          <p className="text-green-400 text-[10px] font-black uppercase mb-3 tracking-widest">Qoidalar</p>
                          <div className="space-y-3">
                             {currentUnit.board.examples.map(e => <p key={e} className="text-sm border-l-4 border-green-500/40 pl-4 py-1 italic">{e}</p>)}
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-blue-50 p-6 rounded-[32px] border-l-[10px] border-blue-500 mb-10 italic text-[#1a2b4b] shadow-sm leading-relaxed">
                   "{isRepeat ? currentUnit.simpleExplanation : currentUnit.videoText}"
                 </div>

                 <button onClick={() => setLessonMode('PRACTICE')} className="w-full py-6 bg-[#58cc02] text-white font-black rounded-3xl shadow-[0_8px_0_rgb(70,163,2)] uppercase tracking-widest text-sm active:translate-y-1 transition-all mt-auto mb-10">
                   Mashqlarni boshlash
                 </button>
              </div>
            )}

            {lessonMode === 'PRACTICE' && currentUnit && (
              <div className="animate-slide-up flex flex-col flex-1">
                 <h2 className="text-2xl font-black text-[#1a2b4b] mb-10 text-center uppercase tracking-tighter">Mashq: {currentUnit.title}</h2>
                 <div className="space-y-8">
                    {currentUnit.exercises.map((ex, qIdx) => (
                      <div key={qIdx} className="space-y-4">
                        <p className="text-lg font-bold text-[#4b4b4b]">{qIdx + 1}. {ex.q}</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                           {ex.options.map((opt, oIdx) => (
                             <button 
                               key={oIdx} 
                               onClick={() => { const n = [...currentAnswers]; n[qIdx] = oIdx; setCurrentAnswers(n); }}
                               className={`p-5 rounded-3xl border-2 font-black text-sm transition-all ${currentAnswers[qIdx] === oIdx ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-gray-100 bg-white hover:border-blue-200'}`}
                             >
                               {opt}
                             </button>
                           ))}
                        </div>
                      </div>
                    ))}
                 </div>
                 <button onClick={processResult} className="w-full mt-auto mb-10 py-6 bg-blue-500 text-white font-black rounded-3xl shadow-[0_8px_0_rgb(29,78,216)] uppercase tracking-widest text-sm active:translate-y-1">
                    Tekshirish
                 </button>
              </div>
            )}

            {lessonMode === 'RESULT' && (
              <div className="flex flex-col items-center justify-center flex-1 text-center animate-bounce-in">
                 <div className="w-32 h-32 bg-green-100 text-[#58cc02] rounded-full flex items-center justify-center text-6xl mb-8"><i className="fa-solid fa-trophy"></i></div>
                 <h2 className="text-4xl font-black text-[#1a2b4b] mb-4">Ajoyib!</h2>
                 <p className="text-gray-500 font-bold mb-10 text-lg">Siz {currentUnit?.title} darsini muvaffaqiyatli yakunladingiz. Keyingi darsga tayyormisiz?</p>
                 <button onClick={() => setSelectedLesson(null)} className="w-full py-6 bg-blue-500 text-white font-black rounded-3xl shadow-[0_8px_0_rgb(29,78,216)] uppercase tracking-widest text-sm">Davom etish</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnDashboard;
