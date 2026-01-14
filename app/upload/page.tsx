"use client";

import React, { useState } from 'react';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [abstract, setAbstract] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'completed'>('idle');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    setUploadStatus('uploading');
    setProgress(0);

    // Симуляция загрузки
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadStatus('completed');
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="font-display text-4xl mb-8 text-center">Submit Manuscript</h1>
      
      <div className="bg-white p-8 border border-sepia shadow-lg">
        
        {/* Title Input */}
        <div className="mb-6">
          <label className="block text-sm font-sans font-bold uppercase tracking-wider mb-2 text-gray-500">Research Title</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-lg font-serif border-b-2 border-gray-200 focus:border-accent outline-none py-2 bg-transparent transition-colors"
            placeholder="e.g. The Economic Impact of the Silk Road"
          />
        </div>

        {/* Keywords */}
        <div className="mb-6">
          <label className="block text-sm font-sans font-bold uppercase tracking-wider mb-2 text-gray-500">Keywords (Comma separated)</label>
          <input 
            type="text" 
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="w-full font-serif border-b-2 border-gray-200 focus:border-accent outline-none py-2 bg-transparent transition-colors"
            placeholder="History, Economics, Asia..."
          />
        </div>

        {/* Abstract */}
        <div className="mb-8">
          <label className="block text-sm font-sans font-bold uppercase tracking-wider mb-2 text-gray-500">Abstract</label>
          <textarea 
            value={abstract}
            onChange={(e) => setAbstract(e.target.value)}
            rows={6}
            className="w-full bg-stone-50 border border-gray-200 p-4 font-serif text-gray-700 focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="Enter abstract..."
          />
        </div>

        {/* File Upload */}
        <div className="mb-8">
           <label className="block text-sm font-sans font-bold uppercase tracking-wider mb-4 text-gray-500">Upload PDF</label>
           <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-accent transition-colors cursor-pointer relative bg-stone-50">
             <input 
               type="file" 
               accept=".pdf"
               onChange={handleFileChange}
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
             />
             <div className="pointer-events-none">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="mt-2 text-sm text-gray-600 font-sans">
                  {file ? file.name : "Drag and drop or click to select PDF"}
                </p>
             </div>
           </div>
        </div>

        {/* Progress Bar */}
        {uploadStatus !== 'idle' && (
          <div className="mb-8">
             <div className="flex justify-between text-xs font-sans uppercase mb-1">
               <span>Uploading...</span>
               <span>{progress}%</span>
             </div>
             <div className="w-full bg-gray-200 rounded-full h-2.5">
               <div 
                 className="bg-accent h-2.5 rounded-full transition-all duration-300" 
                 style={{ width: `${progress}%` }}
               ></div>
             </div>
          </div>
        )}

        {/* Submit Button */}
        <button 
          onClick={handleUpload}
          disabled={!file || uploadStatus === 'uploading' || uploadStatus === 'completed'}
          className="w-full bg-ink text-white py-4 font-sans uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploadStatus === 'completed' ? 'Submission Received' : 'Submit for Review'}
        </button>

      </div>
    </div>
  );
}