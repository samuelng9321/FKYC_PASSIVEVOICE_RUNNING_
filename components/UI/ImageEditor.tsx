
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { X, Upload, Wand2, Download } from 'lucide-react';
import { useStore } from '../../store';

export const ImageEditor: React.FC = () => {
  const { closeArtRoom } = useStore();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setGeneratedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage || !prompt) return;
    
    setLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Extract base64 data without header
      const base64Data = selectedImage.split(',')[1];
      const mimeType = selectedImage.split(';')[0].split(':')[1];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            {
              text: prompt
            }
          ]
        }
      });

      let foundImage = false;
      // Check response for image data
      if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
                  const imgUrl = `data:image/png;base64,${part.inlineData.data}`;
                  setGeneratedImage(imgUrl);
                  foundImage = true;
                  break;
              }
          }
      }
      
      if (!foundImage) {
          setError("No image generated. Try a different prompt.");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black/95 z-[110] text-white flex flex-col p-4 md:p-8 overflow-y-auto">
      <div className="w-full max-w-5xl mx-auto flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-green-500/30 pb-4">
          <div>
            <h1 className="text-3xl font-black font-cyber text-green-400">ART ROOM</h1>
            <p className="text-gray-400 text-sm">Powered by Gemini 2.5 Flash Image</p>
          </div>
          <button onClick={closeArtRoom} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-8 h-8 text-gray-300" />
          </button>
        </div>

        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Controls */}
          <div className="flex flex-col space-y-6">
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-900/50 hover:border-green-500/50 transition-colors relative group h-64">
              {selectedImage ? (
                <img src={selectedImage} alt="Source" className="max-h-full max-w-full object-contain rounded" />
              ) : (
                <div className="text-center text-gray-400">
                  <Upload className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>Click to upload source image</p>
                </div>
              )}
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            {/* Prompt Input */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-green-400 uppercase">Instruction</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Add a retro filter, Remove the person in the background..."
                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-4 text-white focus:outline-none focus:border-green-500 h-32 resize-none"
              />
            </div>

            {/* Action Button */}
            <button
              onClick={handleGenerate}
              disabled={!selectedImage || !prompt || loading}
              className={`w-full py-4 rounded-xl font-black text-xl flex items-center justify-center space-x-2 transition-all
                ${loading 
                  ? 'bg-gray-700 cursor-wait' 
                  : (!selectedImage || !prompt) ? 'bg-gray-800 text-gray-500' : 'bg-gradient-to-r from-green-600 to-yellow-500 text-white hover:scale-105 shadow-[0_0_20px_rgba(0,255,0,0.3)]'
                }`}
            >
              {loading ? (
                <span>GENERATING...</span>
              ) : (
                <>
                  <Wand2 className="w-6 h-6" />
                  <span>GENERATE</span>
                </>
              )}
            </button>
            
            {error && (
                <div className="text-red-400 bg-red-900/20 p-3 rounded border border-red-500/50 text-sm">
                    {error}
                </div>
            )}
          </div>

          {/* Right: Result */}
          <div className="bg-gray-900/80 rounded-xl border border-green-500/30 flex flex-col relative overflow-hidden min-h-[400px]">
            <div className="absolute top-0 left-0 bg-green-600/20 px-4 py-1 rounded-br-xl text-xs font-bold text-green-300 border-r border-b border-green-500/50">
                RESULT
            </div>
            
            <div className="flex-grow flex items-center justify-center p-4">
                {generatedImage ? (
                    <img src={generatedImage} alt="Generated" className="max-w-full max-h-full rounded shadow-2xl border border-gray-700" />
                ) : (
                    <div className="text-center text-gray-600">
                        <div className="w-20 h-20 border-4 border-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center">
                             <Wand2 className="w-8 h-8" />
                        </div>
                        <p>Art will appear here</p>
                    </div>
                )}
            </div>
            
            {generatedImage && (
                <div className="p-4 bg-black/40 border-t border-gray-700 flex justify-end">
                     <a 
                        href={generatedImage} 
                        download="gemini-art.png"
                        className="flex items-center space-x-2 text-sm font-bold text-green-400 hover:text-white transition"
                     >
                         <Download className="w-4 h-4" />
                         <span>DOWNLOAD</span>
                     </a>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
