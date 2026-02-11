"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [abstract, setAbstract] = useState('');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'completed'>('idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const titleId = 'research-title';
  const keywordsId = 'research-keywords';
  const abstractId = 'research-abstract';
  const fileId = 'research-pdf';
  const maxFileSizeMb = 20;

  const isPdf = (selectedFile: File) => {
    return selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!isPdf(selectedFile)) {
      setFile(null);
      setErrorMessage('Допускаются только PDF-файлы.');
      return;
    }

    if (selectedFile.size > maxFileSizeMb * 1024 * 1024) {
      setFile(null);
      setErrorMessage(`Размер файла должен быть меньше ${maxFileSizeMb}MB.`);
      return;
    }

    setFile(selectedFile);
    setErrorMessage('');
  };

  const isFormValid = useMemo(() => {
    return (
      title.trim().length >= 5 &&
      keywords.trim().length > 0 &&
      abstract.trim().length >= 40 &&
      !!file &&
      isPdf(file)
    );
  }, [abstract, file, keywords, title]);

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isFormValid || !file) {
      setErrorMessage('Пожалуйста, заполните все поля и прикрепите корректный PDF перед отправкой.');
      return;
    }

    setErrorMessage('');
    setUploadStatus('uploading');
    setProgress(0);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          setUploadStatus('completed');
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="font-display text-4xl mb-8 text-center">Отправить рукопись</h1>
      
      <form onSubmit={handleUpload} className="bg-white p-8 border border-sepia shadow-lg">
        
        {/* Title Input */}
        <div className="mb-6">
          <label htmlFor={titleId} className="block text-sm font-sans font-bold uppercase tracking-wider mb-2 text-gray-500">Название исследования</label>
          <input 
            id={titleId}
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-lg font-serif border-b-2 border-gray-200 focus:border-accent focus-visible:ring-1 focus-visible:ring-accent outline-none py-2 bg-transparent transition-colors"
            placeholder="например: Экономическое влияние Шелкового пути"
            required
            minLength={5}
          />
        </div>

        {/* Keywords */}
        <div className="mb-6">
          <label htmlFor={keywordsId} className="block text-sm font-sans font-bold uppercase tracking-wider mb-2 text-gray-500">Ключевые слова (через запятую)</label>
          <input 
            id={keywordsId}
            type="text" 
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="w-full font-serif border-b-2 border-gray-200 focus:border-accent focus-visible:ring-1 focus-visible:ring-accent outline-none py-2 bg-transparent transition-colors"
            placeholder="История, Экономика, Азия..."
            required
          />
        </div>

        {/* Abstract */}
        <div className="mb-8">
          <label htmlFor={abstractId} className="block text-sm font-sans font-bold uppercase tracking-wider mb-2 text-gray-500">Аннотация</label>
          <textarea 
            id={abstractId}
            value={abstract}
            onChange={(e) => setAbstract(e.target.value)}
            rows={6}
            className="w-full bg-stone-50 border border-gray-200 p-4 font-serif text-gray-700 focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="Введите аннотацию..."
            required
            minLength={40}
          />
          <p className="mt-2 text-xs text-gray-500">Минимум 40 символов.</p>
        </div>

        {/* File Upload */}
        <div className="mb-8">
           <label htmlFor={fileId} className="block text-sm font-sans font-bold uppercase tracking-wider mb-4 text-gray-500">Загрузите PDF</label>
           <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-accent transition-colors cursor-pointer relative bg-stone-50">
             <input 
               id={fileId}
               type="file" 
               accept=".pdf"
               onChange={handleFileChange}
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
               required
             />
             <div className="pointer-events-none">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="mt-2 text-sm text-gray-600 font-sans">
                  {file ? file.name : "Перетащите файл или нажмите, чтобы выбрать PDF"}
                </p>
             </div>
           </div>
           <p className="mt-2 text-xs text-gray-500">Только PDF, до {maxFileSizeMb}MB.</p>
           {errorMessage && (
             <p className="mt-2 text-sm text-red-600" role="alert">
               {errorMessage}
             </p>
           )}
        </div>

        {/* Progress Bar */}
        {uploadStatus === 'uploading' && (
          <div className="mb-8">
             <div className="flex justify-between text-xs font-sans uppercase mb-1" aria-live="polite">
               <span>Загрузка...</span>
               <span>{progress}%</span>
             </div>
             <div className="w-full bg-gray-200 rounded-full h-2.5">
               <div 
                 className="bg-accent h-2.5 rounded-full transition-all duration-300" 
                 style={{ width: `${progress}%` }}
                 role="progressbar"
                 aria-valuemin={0}
                 aria-valuemax={100}
                 aria-valuenow={progress}
               ></div>
             </div>
          </div>
        )}

        {uploadStatus === 'completed' && (
          <p className="mb-8 rounded-sm border border-green-600 bg-green-50 px-4 py-3 text-green-800" role="status">
            Материал получен. Редакционная проверка начнется в ближайшее время.
          </p>
        )}

        {/* Submit Button */}
        <button 
          type="submit"
          disabled={!isFormValid || uploadStatus === 'uploading' || uploadStatus === 'completed'}
          className="w-full bg-ink text-white py-4 font-sans uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {uploadStatus === 'completed' ? 'Материал отправлен' : 'Отправить на проверку'}
        </button>

      </form>
    </div>
  );
}
