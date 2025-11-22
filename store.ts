
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { create } from 'zustand';
import { GameStatus, RUN_SPEED_BASE, Question, Mistake, GameMode } from './types';
import { audio } from './components/System/Audio';
import { GoogleGenAI, Type } from "@google/genai";

// --- CONTENT BANK ---
// Tier 1: Simple Past / Present (Expanded with HK/School themes)
const QUESTIONS_TIER_1: Question[] = [
    { active: "I booked a room", passive: "A room was booked by me", distractors: ["A room is booked by me", "A room booked me"] },
    { active: "She eats an apple", passive: "An apple is eaten by her", distractors: ["An apple was eaten by her", "An apple eats her"] },
    { active: "He wrote a letter", passive: "A letter was written by him", distractors: ["A letter is written by him", "A letter was wrote by him"] },
    { active: "My mom loves me", passive: "I am loved by my mom", distractors: ["I was loved by my mom", "I love my mom"] },
    { active: "Someone stole my car", passive: "My car was stolen", distractors: ["My car is stolen", "My car was stole"] },
    { active: "John opened the door", passive: "The door was opened by John", distractors: ["The door is opened by John", "The door opens John"] },
    { active: "They built this house", passive: "This house was built by them", distractors: ["This house is built by them", "This house built them"] },
    { active: "Everyone loves chocolate", passive: "Chocolate is loved by everyone", distractors: ["Chocolate was loved by everyone", "Chocolate loves everyone"] },
    { active: "We love FKYC", passive: "FKYC is loved by us", distractors: ["FKYC was loved by us", "FKYC loves us"] },
    { active: "Students wear uniforms", passive: "Uniforms are worn by students", distractors: ["Uniforms were worn by students", "Uniforms wear students"] },
    { active: "I eat dim sum", passive: "Dim sum is eaten by me", distractors: ["Dim sum was eaten by me", "Dim sum eats me"] },
    { active: "The MTR takes me home", passive: "I am taken home by the MTR", distractors: ["I was taken home by the MTR", "I took the MTR home"] },
    { active: "He plays Minecraft", passive: "Minecraft is played by him", distractors: ["Minecraft was played by him", "Minecraft played him"] },
    { active: "She uses an iPhone", passive: "An iPhone is used by her", distractors: ["An iPhone was used by her", "An iPhone used her"] },
    { active: "The prefects help us", passive: "We are helped by the prefects", distractors: ["We were helped by the prefects", "We help the prefects"] },
    { active: "Fill in: The book ___ read by her.", passive: "was", distractors: ["were", "did"] },
    { active: "Fill in: The car ___ washed.", passive: "is", distractors: ["are", "do"] },
];

// Tier 2: Continuous / Perfect / Negatives (Expanded)
const QUESTIONS_TIER_2: Question[] = [
    { active: "They play football", passive: "Football is played by them", distractors: ["Football was played by them", "Football is playing them"] },
    { active: "The cat drank the milk", passive: "The milk was drunk by the cat", distractors: ["The milk is drunk by the cat", "The milk drank the cat"] },
    { active: "We are learning English", passive: "English is being learned by us", distractors: ["English was learned by us", "English is learned by us"] },
    { active: "He helps the poor", passive: "The poor are helped by him", distractors: ["The poor is helped by him", "The poor were helped by him"] },
    { active: "She is singing a song", passive: "A song is being sung by her", distractors: ["A song was sung by her", "A song is sung by her"] },
    { active: "I have finished the job", passive: "The job has been finished by me", distractors: ["The job was finished by me", "The job is finished by me"] },
    { active: "He did not write the letter", passive: "The letter was not written by him", distractors: ["The letter is not written by him", "The letter not written by him"] },
    { active: "Picasso painted this picture", passive: "This picture was painted by Picasso", distractors: ["This picture is painted by Picasso", "This picture painted Picasso"] },
    { active: "They are building a bridge", passive: "A bridge is being built", distractors: ["A bridge is built", "A bridge was built"] },
    { active: "I have lost my Octopus card", passive: "My Octopus card has been lost", distractors: ["My Octopus card was lost", "My Octopus card is lost"] },
    { active: "The teacher is marking exams", passive: "Exams are being marked", distractors: ["Exams were marked", "Exams are marked"] },
    { active: "Someone has eaten my lunch", passive: "My lunch has been eaten", distractors: ["My lunch was eaten", "My lunch is eaten"] },
    { active: "We are watching Mirror", passive: "Mirror is being watched by us", distractors: ["Mirror was watched by us", "Mirror watched us"] },
    { active: "She hasn't done the homework", passive: "The homework hasn't been done", distractors: ["The homework wasn't done", "The homework isn't done"] },
    { active: "They were cleaning the floor", passive: "The floor was being cleaned", distractors: ["The floor is being cleaned", "The floor has been cleaned"] },
    { active: "Fill in: The house is ___ built.", passive: "being", distractors: ["been", "be"] },
    { active: "Fill in: Lunch has ___ served.", passive: "been", distractors: ["being", "be"] },
];

// Tier 3: Modals / Complex / Questions (Expanded)
const QUESTIONS_TIER_3: Question[] = [
    { active: "I will clean the room", passive: "The room will be cleaned by me", distractors: ["The room is cleaned by me", "The room will cleaned by me"] },
    { active: "The police caught the thief", passive: "The thief was caught by the police", distractors: ["The thief is caught by the police", "The thief caught the police"] },
    { active: "Did she do the homework?", passive: "Was the homework done by her?", distractors: ["Is the homework done by her?", "Did the homework done by her?"] },
    { active: "They will buy a new car", passive: "A new car will be bought by them", distractors: ["A new car is bought by them", "A new car will bought by them"] },
    { active: "You can solve this problem", passive: "This problem can be solved by you", distractors: ["This problem could be solved", "This problem can solved"] },
    { active: "She had cooked dinner", passive: "Dinner had been cooked by her", distractors: ["Dinner has been cooked by her", "Dinner was cooked by her"] },
    { active: "They might visit us", passive: "We might be visited by them", distractors: ["We might visited by them", "We may be visited by them"] },
    { active: "Who wrote this book?", passive: "By whom was this book written?", distractors: ["Who was written this book?", "By whom is this book written?"] },
    { active: "You must wear a mask", passive: "A mask must be worn", distractors: ["A mask has to be worn", "A mask was worn"] },
    { active: "We can save the planet", passive: "The planet can be saved by us", distractors: ["The planet could be saved", "The planet saved us"] },
    { active: "Will you pass the DSE?", passive: "Will the DSE be passed by you?", distractors: ["Will the DSE passed by you?", "Is the DSE passed by you?"] },
    { active: "They should stop the noise", passive: "The noise should be stopped", distractors: ["The noise shall be stopped", "The noise stopped"] },
    { active: "Did you see the Victoria Harbour?", passive: "Was the Victoria Harbour seen?", distractors: ["Is the Victoria Harbour seen?", "Has the Victoria Harbour seen?"] },
    { active: "You have to finish the rice", passive: "The rice has to be finished", distractors: ["The rice had to be finished", "The rice must be finished"] },
    { active: "Fill in: It ___ be done.", passive: "can", distractors: ["is", "are"] },
    { active: "Fill in: The rules must be ___.", passive: "followed", distractors: ["follow", "following"] },
];

export const TARGET_LETTERS = ['F', 'K', 'Y', 'C'];

interface GameState {
  status: GameStatus;
  gameMode: GameMode; // NEW: Track mode
  score: number;
  lives: number;
  maxLives: number;
  speed: number;
  
  // Audio
  isMuted: boolean;

  // Question State
  currentQuestion: Question | null;
  currentOptions: { text: string; isCorrect: boolean }[]; 
  questionsAnswered: number;
  consecutiveCorrect: number; 
  usedQuestions: string[]; 
  lastAnswerResult: 'correct' | 'wrong' | null; 
  
  // Mistake Tracking
  mistakes: Mistake[];
  explanations: Record<string, string>; 
  isGeneratingExplanations: boolean;

  // Effects
  lastDamageTime: number;

  // Letter Mission
  collectedLetters: string[];

  level: number;
  laneCount: number;
  gemsCollected: number;
  distance: number;
  
  // Inventory / Abilities
  hasDoubleJump: boolean;
  hasImmortality: boolean;
  isImmortalityActive: boolean;

  // Actions
  startGame: (mode: GameMode) => void; // Updated signature
  restartGame: () => void;
  togglePause: () => void;
  takeDamage: () => void;
  addScore: (amount: number) => void;
  collectGem: (value: number) => void;
  collectLetter: (char: string) => void;
  
  // Logic
  generateNextQuestion: () => void;
  handleDoorHit: (isCorrect: boolean, selectedAnswer?: string) => void;
  generateExplanations: () => Promise<void>;
  
  setStatus: (status: GameStatus) => void;
  setDistance: (dist: number) => void;
  toggleMute: () => void;
  
  // Shop / Abilities
  buyItem: (type: 'DOUBLE_JUMP' | 'MAX_LIFE' | 'HEAL' | 'IMMORTAL', cost: number) => boolean;
  openShop: () => void;
  closeShop: () => void;
  activateImmortality: () => void;

  // Art Room
  openArtRoom: () => void;
  closeArtRoom: () => void;
}

export const useStore = create<GameState>((set, get) => ({
  status: GameStatus.MENU,
  gameMode: 'NORMAL',
  score: 0,
  lives: 3,
  maxLives: 3,
  speed: 0,
  level: 1,
  laneCount: 3,
  gemsCollected: 0,
  distance: 0,
  
  isMuted: false,

  currentQuestion: null,
  currentOptions: [],
  questionsAnswered: 0,
  consecutiveCorrect: 0,
  usedQuestions: [],
  lastAnswerResult: null,
  lastDamageTime: 0,

  mistakes: [],
  explanations: {},
  isGeneratingExplanations: false,

  collectedLetters: [],

  hasDoubleJump: false,
  hasImmortality: false,
  isImmortalityActive: false,

  startGame: (mode: GameMode) => {
      set({ 
        status: GameStatus.PLAYING, 
        gameMode: mode, // Set the mode
        score: 0, 
        lives: 3, 
        maxLives: 3,
        speed: RUN_SPEED_BASE,
        level: 1,
        laneCount: 3,
        gemsCollected: 0,
        distance: 0,
        questionsAnswered: 0,
        consecutiveCorrect: 0,
        collectedLetters: [],
        usedQuestions: [],
        lastAnswerResult: null,
        hasDoubleJump: false,
        hasImmortality: false,
        isImmortalityActive: false,
        lastDamageTime: 0,
        mistakes: [],
        explanations: {},
        isGeneratingExplanations: false
      });
      get().generateNextQuestion();
  },

  restartGame: () => {
      // Restart with same mode
      const currentMode = get().gameMode;
      get().startGame(currentMode);
  },

  togglePause: () => {
      const { status } = get();
      if (status === GameStatus.PLAYING) {
          set({ status: GameStatus.PAUSED });
      } else if (status === GameStatus.PAUSED) {
          set({ status: GameStatus.PLAYING });
      }
  },

  generateNextQuestion: () => {
      const { score, usedQuestions, gameMode } = get();
      
      // Dynamic Difficulty: Expand pool based on score OR Challenge mode scaling
      let pool: Question[] = QUESTIONS_TIER_1;
      
      // Normal & Challenge Mode Progression
      if (score > 3000) {
          pool = [...QUESTIONS_TIER_1, ...QUESTIONS_TIER_2];
      }
      if (score > 6000) {
          pool = [...QUESTIONS_TIER_2, ...QUESTIONS_TIER_3];
      }
      
      // Challenge Mode Hardcore: Mix everything after 10000
      if (gameMode === 'CHALLENGE' && score > 10000) {
          pool = [...QUESTIONS_TIER_1, ...QUESTIONS_TIER_2, ...QUESTIONS_TIER_3];
      }
      
      // Filter out used questions to prevent repeats
      let available = pool.filter(q => !usedQuestions.includes(q.active));

      // Reset used list if exhausted (Infinite play support)
      if (available.length === 0) {
          available = pool;
          set({ usedQuestions: [] });
      }

      const q = available[Math.floor(Math.random() * available.length)];
      
      const options = [
          { text: q.passive, isCorrect: true },
          { text: q.distractors[0], isCorrect: false },
          { text: q.distractors[1], isCorrect: false }
      ];

      // Shuffle options
      for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
      }

      set(state => ({ 
          currentQuestion: q, 
          currentOptions: options,
          usedQuestions: [...state.usedQuestions, q.active]
      }));
  },

  handleDoorHit: (isCorrect, selectedAnswer) => {
      const { questionsAnswered, speed, score, consecutiveCorrect, currentQuestion, gameMode } = get();
      
      if (isCorrect) {
          set({ lastAnswerResult: 'correct' });
          setTimeout(() => set({ lastAnswerResult: null }), 800);

          const newStreak = consecutiveCorrect + 1;
          const streakBonus = Math.min(newStreak, 10) * 100; 
          const newScore = score + 500 + streakBonus;
          const newCount = questionsAnswered + 1;
          
          let newSpeed = speed;
          // Higher speed cap for Challenge Mode
          const speedCap = gameMode === 'CHALLENGE' ? 80 : (score > 6000 ? 55 : 45);
          
          if (newSpeed < speedCap) {
             newSpeed += 0.2 + (newStreak * 0.05); 
          }

          set({ 
              score: newScore, 
              questionsAnswered: newCount, 
              consecutiveCorrect: newStreak,
              speed: newSpeed 
          });

          get().generateNextQuestion();
      } else {
          set({ lastAnswerResult: 'wrong' });
          setTimeout(() => set({ lastAnswerResult: null }), 800);

          if (currentQuestion && selectedAnswer) {
              set(state => ({
                  mistakes: [...state.mistakes, { question: currentQuestion, selectedAnswer }]
              }));
          }

          get().takeDamage();
          set({ 
              consecutiveCorrect: 0,
              speed: Math.max(RUN_SPEED_BASE, speed - 3)
          });
      }
  },

  collectLetter: (char: string) => {
      const { collectedLetters, gameMode, lives, maxLives } = get();
      if (!collectedLetters.includes(char)) {
          const newCollection = [...collectedLetters, char];
          
          // Basic reward
          set({ collectedLetters: newCollection, score: get().score + 1000 });
          
          // Check Set Completion
          const hasAll = TARGET_LETTERS.every(l => newCollection.includes(l));
          
          if (hasAll) {
              if (gameMode === 'NORMAL') {
                  // Win Condition for Story Mode
                  set({ status: GameStatus.VICTORY, speed: 0 });
              } else {
                  // Endless Mode: Reset letters, give massive bonus, Heal
                  set({ 
                      collectedLetters: [], // Reset for next round
                      score: get().score + 5000, // Huge bonus
                      lives: Math.min(lives + 1, maxLives) // Heal player
                  });
                  audio.playGemCollect(); // Extra feedback
              }
          }
      } else {
          set({ score: get().score + 200 }); // Bonus for duplicates
      }
  },

  takeDamage: () => {
    const { lives, isImmortalityActive } = get();
    if (isImmortalityActive) return; 
    
    set({ lastDamageTime: Date.now() });

    if (lives > 1) {
      set({ lives: lives - 1 });
    } else {
      set({ lives: 0, status: GameStatus.GAME_OVER, speed: 0 });
    }
  },

  addScore: (amount) => set((state) => ({ score: state.score + amount })),
  
  collectGem: (value) => set((state) => ({ 
    score: state.score + value, 
    gemsCollected: state.gemsCollected + 1 
  })),

  setDistance: (dist) => set({ distance: dist }),

  toggleMute: () => {
      const newState = !get().isMuted;
      set({ isMuted: newState });
      audio.setMute(newState);
  },

  openShop: () => set({ status: GameStatus.SHOP }),
  
  closeShop: () => set({ status: GameStatus.PLAYING }),

  buyItem: (type, cost) => {
      const { score, maxLives, lives } = get();
      
      if (score >= cost) {
          set({ score: score - cost });
          
          switch (type) {
              case 'DOUBLE_JUMP':
                  set({ hasDoubleJump: true });
                  break;
              case 'MAX_LIFE':
                  set({ maxLives: maxLives + 1, lives: lives + 1 });
                  break;
              case 'HEAL':
                  set({ lives: Math.min(lives + 1, maxLives) });
                  break;
              case 'IMMORTAL':
                  set({ hasImmortality: true });
                  break;
          }
          return true;
      }
      return false;
  },

  activateImmortality: () => {
      const { hasImmortality, isImmortalityActive } = get();
      if (hasImmortality && !isImmortalityActive) {
          set({ isImmortalityActive: true });
          setTimeout(() => {
              set({ isImmortalityActive: false });
          }, 5000);
      }
  },

  openArtRoom: () => set({ status: GameStatus.ART_ROOM }),
  closeArtRoom: () => set({ status: GameStatus.MENU }),

  setStatus: (status) => set({ status }),

  generateExplanations: async () => {
      const { mistakes, isGeneratingExplanations } = get();
      if (mistakes.length === 0 || isGeneratingExplanations) return;

      set({ isGeneratingExplanations: true });

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          const mistakeData = mistakes.map(m => ({
              active: m.question.active,
              passive: m.question.passive,
              studentAnswer: m.selectedAnswer
          }));

          const prompt = `
            You are an English Grammar Teacher. A student made the following mistakes in converting Active Voice to Passive Voice.
            Explain simply why their answer is wrong or how the correct passive form is constructed (focus on verb to be + past participle).
            
            Data: ${JSON.stringify(mistakeData)}
            
            Return a JSON object where keys are the "active" sentences and values are the short explanation string.
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          explanations: {
                              type: Type.ARRAY,
                              items: {
                                  type: Type.OBJECT,
                                  properties: {
                                      question: { type: Type.STRING },
                                      explanation: { type: Type.STRING }
                                  }
                              }
                          }
                      }
                  }
              }
          });
          
          if (response.text) {
             const json = JSON.parse(response.text);
             const explMap: Record<string, string> = {};
             if (json.explanations) {
                 json.explanations.forEach((item: any) => {
                     explMap[item.question] = item.explanation;
                 });
             }
             set({ explanations: explMap });
          }

      } catch (e) {
          console.error("Gemini explanation failed", e);
      } finally {
          set({ isGeneratingExplanations: false });
      }
  }
}));
