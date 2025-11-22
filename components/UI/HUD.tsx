
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect } from 'react';
import { Heart, Zap, Trophy, Shield, Activity, PlusCircle, Play, ArrowUpCircle, Volume2, VolumeX, Flame, Flower, Palette, Pause, Sparkles, BrainCircuit, Infinity } from 'lucide-react';
import { useStore, TARGET_LETTERS } from '../../store';
import { GameStatus, ShopItem, RUN_SPEED_BASE } from '../../types';
import { audio } from '../System/Audio';
import { ImageEditor } from './ImageEditor';

// Available Shop Items
const SHOP_ITEMS: ShopItem[] = [
    {
        id: 'DOUBLE_JUMP',
        name: 'DOUBLE JUMP',
        description: 'Jump again in mid-air.',
        cost: 1000,
        icon: ArrowUpCircle,
        oneTime: true
    },
    {
        id: 'MAX_LIFE',
        name: 'MAX LIFE UP',
        description: 'Permanently adds a heart slot.',
        cost: 1500,
        icon: Activity
    },
    {
        id: 'HEAL',
        name: 'REPAIR KIT',
        description: 'Restores 1 Life point.',
        cost: 1000,
        icon: PlusCircle
    },
    {
        id: 'IMMORTAL',
        name: 'IMMORTALITY',
        description: '5s Invincibility (Shift/I).',
        cost: 3000,
        icon: Shield,
        oneTime: true
    }
];

const ShopScreen: React.FC = () => {
    const { score, buyItem, closeShop, hasDoubleJump, hasImmortality } = useStore();
    const [items, setItems] = useState<ShopItem[]>([]);

    useEffect(() => {
        let pool = SHOP_ITEMS.filter(item => {
            if (item.id === 'DOUBLE_JUMP' && hasDoubleJump) return false;
            if (item.id === 'IMMORTAL' && hasImmortality) return false;
            return true;
        });
        setItems(pool);
    }, [hasDoubleJump, hasImmortality]);

    return (
        <div className="absolute inset-0 bg-black/90 z-[100] text-white pointer-events-auto backdrop-blur-md overflow-y-auto">
             <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
                 <h2 className="text-3xl md:text-4xl font-black text-green-400 mb-2 font-cyber tracking-widest text-center">UPGRADE MODULE</h2>
                 <div className="flex items-center text-yellow-400 mb-6 md:mb-8">
                     <span className="text-base md:text-lg mr-2">CREDITS:</span>
                     <span className="text-xl md:text-2xl font-bold">{score.toLocaleString()}</span>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl w-full mb-8">
                     {items.map(item => {
                         const Icon = item.icon;
                         const canAfford = score >= item.cost;
                         return (
                             <div key={item.id} className="bg-gray-900/80 border border-green-700 p-4 md:p-6 rounded-xl flex flex-col items-center text-center hover:border-yellow-500 transition-colors">
                                 <div className="bg-gray-800 p-3 md:p-4 rounded-full mb-3 md:mb-4">
                                     <Icon className="w-6 h-6 md:w-8 md:h-8 text-green-400" />
                                 </div>
                                 <h3 className="text-lg md:text-xl font-bold mb-2">{item.name}</h3>
                                 <p className="text-gray-400 text-xs md:text-sm mb-4 h-10 md:h-12 flex items-center justify-center">{item.description}</p>
                                 <button 
                                    onClick={() => buyItem(item.id as any, item.cost)}
                                    disabled={!canAfford}
                                    className={`px-4 md:px-6 py-2 rounded font-bold w-full text-sm md:text-base ${canAfford ? 'bg-gradient-to-r from-green-600 to-yellow-600 hover:brightness-110' : 'bg-gray-700 cursor-not-allowed opacity-50'}`}
                                 >
                                     {item.cost} PTS
                                 </button>
                             </div>
                         );
                     })}
                 </div>

                 <button 
                    onClick={closeShop}
                    className="flex items-center px-8 md:px-10 py-3 md:py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-lg md:text-xl rounded hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,255,0,0.4)]"
                 >
                     RESUME <Play className="ml-2 w-5 h-5" fill="white" />
                 </button>
             </div>
        </div>
    );
};

export const HUD: React.FC = () => {
  const { 
      score, lives, maxLives, status, restartGame, startGame, speed, 
      currentQuestion, currentOptions, collectedLetters, isImmortalityActive,
      consecutiveCorrect, isMuted, toggleMute, lastAnswerResult,
      lastDamageTime, openArtRoom, togglePause, mistakes, generateExplanations,
      explanations, isGeneratingExplanations, gameMode
  } = useStore();
  
  // Damage Flash Effect Logic
  const [damageFlash, setDamageFlash] = useState(false);
  useEffect(() => {
      if (lastDamageTime > 0) {
          setDamageFlash(true);
          const t = setTimeout(() => setDamageFlash(false), 300);
          return () => clearTimeout(t);
      }
  }, [lastDamageTime]);

  // Tier Calculation
  const getTier = (score: number) => {
      if (score > 6000) return { label: 'TIER 3', color: 'text-red-500', border: 'border-red-500' };
      if (score > 3000) return { label: 'TIER 2', color: 'text-yellow-500', border: 'border-yellow-500' };
      return { label: 'TIER 1', color: 'text-green-500', border: 'border-green-500' };
  };
  const currentTier = getTier(score);

  // Common container style
  const containerClass = "absolute inset-0 pointer-events-none flex flex-col justify-between z-50 overflow-hidden";

  if (status === GameStatus.SHOP) {
      return <ShopScreen />;
  }

  if (status === GameStatus.ART_ROOM) {
      return <ImageEditor />;
  }

  if (status === GameStatus.MENU) {
      return (
          <div className="absolute inset-0 flex items-center justify-center z-[100] pointer-events-auto">
              {/* Background Overlay - Semi-transparent Dark to show 3D scene behind */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

              <div className="relative z-10 w-full max-w-2xl p-8 flex flex-col items-center text-center">
                 {/* Header Group */}
                 <div className="mb-8 animate-in fade-in zoom-in duration-700">
                     <div className="text-yellow-400 font-bold tracking-[0.5em] text-sm mb-2 drop-shadow-md">FANLING KAU YAN COLLEGE</div>
                     <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-yellow-300 mb-4 font-cyber drop-shadow-[0_0_20px_rgba(50,205,50,0.5)]">
                         ENGLISH<br/>RUNNER
                     </h1>
                     <div className="flex items-center justify-center space-x-4 text-green-500">
                        <Flower className="w-8 h-8 animate-spin-slow" />
                        <span className="font-mono text-xs tracking-widest text-green-300/80 border border-green-500/30 px-2 py-1 rounded">SYSTEM_READY</span>
                        <Flower className="w-8 h-8 animate-spin-slow" />
                     </div>
                 </div>

                 {/* Mode Selection */}
                 <div className="w-full flex flex-col gap-4 mb-8">
                     {/* Normal Mode */}
                     <button 
                        onClick={() => { audio.init(); startGame('NORMAL'); }}
                        className="group relative w-full max-w-md mx-auto py-4 bg-green-600/20 border-2 border-green-500 text-green-400 font-black text-xl rounded-xl overflow-hidden transition-all hover:scale-105 hover:bg-green-600/30 hover:text-white hover:shadow-[0_0_40px_rgba(0,255,0,0.4)]"
                        >
                        <div className="absolute inset-0 w-full h-full bg-green-400/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                        <div className="flex items-center justify-center gap-3 relative z-10">
                            <span>STORY RUN</span> 
                            <Play className="w-6 h-6 fill-current" />
                        </div>
                        <div className="text-[10px] font-mono uppercase mt-1 opacity-70">Collect FKYC to Win</div>
                    </button>

                    {/* Challenge Mode */}
                    <button 
                        onClick={() => { audio.init(); startGame('CHALLENGE'); }}
                        className="group relative w-full max-w-md mx-auto py-4 bg-purple-600/20 border-2 border-purple-500 text-purple-400 font-black text-xl rounded-xl overflow-hidden transition-all hover:scale-105 hover:bg-purple-600/30 hover:text-white hover:shadow-[0_0_40px_rgba(168,85,247,0.4)]"
                        >
                        <div className="absolute inset-0 w-full h-full bg-purple-400/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                        <div className="flex items-center justify-center gap-3 relative z-10">
                            <span>ENDLESS CHALLENGE</span> 
                            <Infinity className="w-6 h-6" />
                        </div>
                        <div className="text-[10px] font-mono uppercase mt-1 opacity-70">Infinite Questions • High Speed</div>
                    </button>
                 </div>

                {/* Art Room Button */}
                <button 
                   onClick={() => { audio.init(); openArtRoom(); }}
                   className="mt-2 flex items-center gap-2 text-green-500/60 hover:text-green-400 transition-colors font-mono text-sm tracking-widest border-b border-transparent hover:border-green-500/50 pb-1"
                >
                    <Palette className="w-4 h-4" />
                    <span>ACCESS ART TERMINAL</span>
                </button>
              </div>
          </div>
      );
  }

  if (status === GameStatus.PAUSED) {
      return (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center text-white pointer-events-auto">
              <div className="text-center p-8 border-2 border-green-500/50 rounded-xl bg-black/60 shadow-[0_0_50px_rgba(0,255,0,0.2)]">
                  <Pause className="w-16 h-16 mx-auto mb-4 text-green-400 animate-pulse" />
                  <h2 className="text-5xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-yellow-400 mb-2">PAUSED</h2>
                  <p className="text-green-500/70 text-sm tracking-[0.3em] mb-8">SYSTEM HALTED</p>
                  <button 
                    onClick={togglePause}
                    className="px-8 py-3 bg-green-600 hover:bg-green-500 text-black font-bold rounded transition-colors shadow-[0_0_20px_rgba(0,255,0,0.5)]"
                  >
                      RESUME MISSION
                  </button>
                  <p className="mt-4 text-xs text-gray-500">PRESS SPACE TO RESUME</p>
              </div>
          </div>
      )
  }

  if (status === GameStatus.VICTORY) {
      return (
        <div className="absolute inset-0 bg-black/90 z-[100] text-white pointer-events-auto backdrop-blur-sm flex items-center justify-center">
            <div className="text-center p-8 bg-gray-900/80 border border-yellow-500 rounded-2xl shadow-[0_0_100px_rgba(255,215,0,0.3)] max-w-lg w-full mx-4">
                <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6 animate-bounce" />
                <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-green-500 mb-4 font-cyber">VICTORY</h1>
                <p className="text-xl text-white mb-8">FKYC MASTERED!</p>
                
                <div className="text-2xl font-mono text-green-400 mb-8">
                    FINAL SCORE: {score.toLocaleString()}
                </div>
                
                <button 
                  onClick={() => { audio.init(); restartGame(); }}
                  className="px-10 py-4 bg-gradient-to-r from-yellow-500 to-green-600 text-black font-black text-xl rounded hover:scale-105 transition-all"
                >
                    PLAY AGAIN
                </button>
            </div>
        </div>
      )
  }

  if (status === GameStatus.GAME_OVER) {
      return (
          <div className="absolute inset-0 bg-black/90 z-[100] text-white pointer-events-auto backdrop-blur-sm overflow-y-auto">
              <style>{`
                @keyframes glitch {
                  0% { transform: translate(0); }
                  20% { transform: translate(-2px, 2px); }
                  40% { transform: translate(-2px, -2px); }
                  60% { transform: translate(2px, 2px); }
                  80% { transform: translate(2px, -2px); }
                  100% { transform: translate(0); }
                }
                .glitch-text {
                  animation: glitch 0.3s cubic-bezier(.25, .46, .45, .94) both infinite;
                }
              `}</style>
              <div className="flex flex-col items-center min-h-full py-8 px-4">
                <h1 className="text-5xl md:text-7xl font-black text-red-500 mb-2 font-cyber text-center glitch-text drop-shadow-[0_0_30px_rgba(255,0,0,0.9)] animate-pulse">
                    GAME OVER
                </h1>
                <p className="text-gray-400 mb-8 uppercase tracking-widest">Mission Failed</p>
                
                <div className="bg-gray-800/50 p-3 md:p-4 rounded-lg flex items-center justify-center border border-gray-700 mb-8 w-full max-w-md">
                    <div className="flex items-center text-white text-sm md:text-base mr-4">SCORE</div>
                    <div className="text-2xl md:text-3xl font-bold font-cyber text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-green-500">{score.toLocaleString()}</div>
                </div>

                {/* Mission Debrief (Mistake Log) */}
                {mistakes.length > 0 && (
                    <div className="w-full max-w-2xl bg-gray-900/80 border border-red-500/30 rounded-xl p-6 mb-8 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-red-400 font-black tracking-widest flex items-center">
                                <Activity className="w-4 h-4 mr-2" />
                                MISSION DEBRIEF: ERRORS DETECTED
                            </h3>
                            {!explanations[mistakes[0].question.active] && (
                                <button 
                                    onClick={generateExplanations}
                                    disabled={isGeneratingExplanations}
                                    className={`flex items-center space-x-2 px-3 py-1 rounded text-xs font-bold border transition-all
                                    ${isGeneratingExplanations 
                                        ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-wait' 
                                        : 'bg-blue-600/20 border-blue-500 text-blue-300 hover:bg-blue-600/40'}`}
                                >
                                    <BrainCircuit className="w-3 h-3" />
                                    <span>{isGeneratingExplanations ? 'ANALYZING...' : 'GENERATE REPORT (GEMINI)'}</span>
                                </button>
                            )}
                        </div>
                        
                        <div className="space-y-4">
                            {mistakes.map((m, i) => (
                                <div key={i} className="bg-black/40 p-4 rounded border border-gray-700">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                                        <span className="text-gray-400 text-xs uppercase tracking-wider mb-1 md:mb-0">Question</span>
                                        <span className="text-white font-bold">"{m.question.active}"</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div className="text-red-400">
                                            <span className="block text-[10px] uppercase text-red-500/70">Your Input</span>
                                            {m.selectedAnswer}
                                        </div>
                                        <div className="text-green-400">
                                            <span className="block text-[10px] uppercase text-green-500/70">Correct Form</span>
                                            {m.question.passive}
                                        </div>
                                    </div>
                                    
                                    {/* AI Explanation */}
                                    {explanations[m.question.active] && (
                                        <div className="mt-3 pt-3 border-t border-gray-700/50 text-blue-200 text-xs italic flex items-start">
                                            <Sparkles className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0 text-blue-400" />
                                            {explanations[m.question.active]}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button 
                  onClick={() => { audio.init(); restartGame(); }}
                  className="px-8 md:px-10 py-3 md:py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold text-lg md:text-xl rounded hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,0,0,0.4)]"
                >
                    RETRY MISSION
                </button>
              </div>
          </div>
      );
  }

  return (
    <div className={containerClass}>
        {/* Damage Flash Overlay */}
        <div 
            className={`fixed inset-0 bg-red-600 mix-blend-multiply pointer-events-none z-[40] transition-opacity duration-200 ${damageFlash ? 'opacity-40' : 'opacity-0'}`} 
        />

        {/* Animation Overlays for Answer Feedback */}
        {lastAnswerResult === 'correct' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[60]">
                <div className="text-6xl md:text-8xl font-black text-green-400 font-cyber animate-bounce drop-shadow-[0_0_30px_rgba(0,255,0,0.8)]">
                    CORRECT!
                </div>
                <div className="absolute inset-0 bg-green-500/20 mix-blend-overlay animate-pulse"></div>
            </div>
        )}
        {lastAnswerResult === 'wrong' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[60]">
                <div className="text-6xl md:text-8xl font-black text-red-500 font-cyber animate-pulse drop-shadow-[0_0_30px_rgba(255,0,0,0.8)]">
                    WRONG!
                </div>
                <div className="absolute inset-0 bg-red-500/20 mix-blend-overlay animate-pulse"></div>
            </div>
        )}


        {/* NEW TOP BAR: Score Left, Question Center, Hearts Right */}
        <div className="w-full bg-gradient-to-b from-black/90 to-transparent pt-2 pb-8 px-6 flex justify-between items-start">
             
             {/* LEFT: Giant Score & Streak */}
             <div className="flex flex-col items-start min-w-[100px]">
                 <div className="text-xs text-green-600 font-mono font-bold tracking-widest">SCORE</div>
                 <div className="text-4xl md:text-5xl font-bold text-green-400 font-cyber drop-shadow-[0_0_10px_rgba(0,255,0,0.6)]">
                     {score.toLocaleString()}
                 </div>
                 {consecutiveCorrect > 1 && (
                     <div className="mt-2 flex items-center space-x-2 animate-pulse">
                         <Flame className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                         <span className="text-yellow-400 font-black italic text-lg">COMBO x{consecutiveCorrect}</span>
                     </div>
                 )}
                 {gameMode === 'CHALLENGE' && (
                     <div className="mt-1 px-2 py-0.5 bg-purple-900/50 border border-purple-500/50 text-purple-300 text-[10px] font-bold tracking-wider rounded">
                         ENDLESS RUN
                     </div>
                 )}
             </div>

             {/* CENTER: Giant Question + FKYC */}
             <div className="flex flex-col items-center mx-4 flex-grow max-w-3xl">
                 {/* School Header Small */}
                 <div className="text-xs text-green-500/70 font-bold mb-1 tracking-[0.3em]">FKYC GRAMMAR CHALLENGE</div>
                 
                {currentQuestion && (
                    <div 
                        key={currentQuestion.active} // Triggers animation on change
                        className="w-full flex flex-col items-center animate-in slide-in-from-top-10 fade-in duration-300 ease-out"
                    >
                        {/* FKYC Row */}
                        <div className="flex items-center space-x-3 mb-2 bg-black/60 px-4 py-1 rounded-full border border-green-500/30 backdrop-blur-sm">
                            <span className="text-white/50 font-black text-xs tracking-widest">COLLECT:</span>
                            {TARGET_LETTERS.map((char) => {
                                const isCollected = collectedLetters.includes(char);
                                return (
                                    <span 
                                        key={char}
                                        className={`text-xl font-black transition-all
                                        ${isCollected 
                                            ? 'text-yellow-400 drop-shadow-[0_0_8px_gold] scale-110' 
                                            : 'text-gray-700'}`}
                                    >
                                        {char}
                                    </span>
                                );
                            })}
                        </div>

                        {/* Question Box */}
                        <div className="relative group w-full">
                            <div className={`absolute -inset-1 bg-gradient-to-r ${gameMode === 'CHALLENGE' ? 'from-purple-600 to-blue-600' : 'from-green-600 to-yellow-600'} rounded-xl blur opacity-40 group-hover:opacity-60 transition-opacity`}></div>
                            <div className="relative bg-gray-900/90 px-6 md:px-10 py-4 rounded-xl border-2 border-green-700 flex flex-col items-center shadow-2xl">
                                <span className="text-[10px] md:text-xs text-gray-400 uppercase tracking-[0.3em] mb-1">PASSIVE VOICE CHALLENGE</span>
                                <span className="text-2xl md:text-4xl font-black text-white text-center leading-tight tracking-wide drop-shadow-md">
                                    "{currentQuestion.active}"
                                </span>
                            </div>
                        </div>
                    </div>
                )}
             </div>

             {/* RIGHT: Giant Hearts */}
             <div className="flex flex-col items-end min-w-[100px]">
                <div className="flex items-center bg-black/40 px-3 py-2 rounded-full border border-green-500/30 space-x-1 mb-2">
                    {[...Array(maxLives)].map((_, i) => (
                        <Heart 
                            key={i} 
                            className={`w-8 h-8 md:w-10 md:h-10 transition-all drop-shadow-lg ${i < lives ? 'text-pink-500 fill-pink-500 animate-pulse' : 'text-gray-800 fill-gray-900'}`} 
                        />
                    ))}
                </div>
                {/* Difficulty Tier Indicator */}
                <div className={`text-[10px] font-black tracking-[0.2em] px-2 py-1 rounded border bg-black/50 ${currentTier.color} ${currentTier.border}`}>
                    {currentTier.label}
                </div>
             </div>
        </div>

        {/* CENTER: Skill Indicator */}
        {isImmortalityActive && (
             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                 <div className="text-yellow-400 font-bold text-3xl animate-pulse flex flex-col items-center drop-shadow-[0_0_20px_gold]">
                     <Shield className="w-12 h-12 fill-yellow-400 mb-2" /> 
                     INVINCIBLE
                 </div>
             </div>
        )}

        {/* BOTTOM: Answer Lane Grid */}
        <div className="w-full p-2 pb-6 md:pb-8 relative pointer-events-auto">
            
            {/* Mute Button - Bottom Left */}
            <button 
                onClick={toggleMute}
                className="absolute bottom-28 left-4 md:bottom-8 md:left-8 z-50 bg-black/50 p-2 rounded-full border border-white/20 hover:bg-white/10 transition-colors"
            >
                {isMuted ? <VolumeX className="text-red-400 w-6 h-6" /> : <Volume2 className="text-green-400 w-6 h-6" />}
            </button>

            {currentOptions.length > 0 && (
                <div className="grid grid-cols-3 gap-2 md:gap-4 w-full max-w-6xl mx-auto">
                    {/* Left Lane Answer */}
                    <div className="flex flex-col items-center">
                        <div className="mb-1 text-xs text-green-500/50 font-mono tracking-widest">LEFT LANE</div>
                        <div className="w-full bg-black/85 border-2 border-green-900/50 rounded-xl p-2 md:p-4 min-h-[100px] flex items-center justify-center text-center backdrop-blur shadow-[0_0_20px_rgba(0,255,0,0.05)]">
                            <span className="text-xl md:text-3xl font-bold text-green-100 leading-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                                {currentOptions[0].text}
                            </span>
                        </div>
                    </div>

                    {/* Center Lane Answer */}
                    <div className="flex flex-col items-center">
                        <div className="mb-1 text-xs text-green-500/50 font-mono tracking-widest">CENTER LANE</div>
                        <div className="w-full bg-black/85 border-2 border-green-900/50 rounded-xl p-2 md:p-4 min-h-[100px] flex items-center justify-center text-center backdrop-blur shadow-[0_0_20px_rgba(0,255,0,0.05)]">
                            <span className="text-xl md:text-3xl font-bold text-green-100 leading-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                                {currentOptions[1].text}
                            </span>
                        </div>
                    </div>

                    {/* Right Lane Answer */}
                    <div className="flex flex-col items-center">
                        <div className="mb-1 text-xs text-green-500/50 font-mono tracking-widest">RIGHT LANE</div>
                        <div className="w-full bg-black/85 border-2 border-green-900/50 rounded-xl p-2 md:p-4 min-h-[100px] flex items-center justify-center text-center backdrop-blur shadow-[0_0_20px_rgba(0,255,0,0.05)]">
                            <span className="text-xl md:text-3xl font-bold text-green-100 leading-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                                {currentOptions[2].text}
                            </span>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Speed & Version Footer */}
            <div className="flex justify-between items-end mt-2 px-4 pointer-events-none">
                <div className="text-white/20 text-[10px] font-mono pl-12 md:pl-0">SYS.FKYC.EDU // v5.0 // MODE: {gameMode}</div>
                <div className="flex items-center space-x-1 text-green-500 opacity-80 bg-black/40 px-2 py-0.5 rounded-full border border-green-900/50">
                    <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="font-mono text-xs font-bold">{Math.round((speed / RUN_SPEED_BASE) * 100)}%</span>
                </div>
            </div>
        </div>
    </div>
  );
};
