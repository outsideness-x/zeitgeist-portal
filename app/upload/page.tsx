"use client";

import React, { useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { backendRequest, getBackendBaseUrl } from '@/services/backend/client';

type SubmissionCreateResponse = {
  submission: {
    id: string;
    status: string;
  };
};

type UploadInitResponse = {
  submissionId: string;
  storageKey: string;
  uploadUrl: string;
  requiredContentType: string;
};

export default function UploadPage() {
  const { user, csrfToken, loading: authLoading } = useAuth();
  const createLockRef = useRef(false);
  const idempotencyKeyRef = useRef<string | null>(null);
  const idempotencyFingerprintRef = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [abstract, setAbstract] = useState('');
  const [requestedSection, setRequestedSection] = useState<'journal' | 'research' | 'nova'>('research');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'completed'>('idle');

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
      setErrorMessage('допускаются только pdf-файлы.');
      return;
    }

    if (selectedFile.size > maxFileSizeMb * 1024 * 1024) {
      setFile(null);
      setErrorMessage(`размер файла должен быть меньше ${maxFileSizeMb}mb.`);
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

  const toXhrError = (xhr: XMLHttpRequest, fallback: string) => {
    const contentType = xhr.getResponseHeader('content-type') ?? '';
    const responseText = xhr.responseText?.trim();

    if (responseText && contentType.includes('application/json')) {
      try {
        const payload = JSON.parse(responseText) as { message?: unknown };
        if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
          return new Error(payload.message);
        }
      } catch {
        return new Error(fallback);
      }
    }

    return new Error(fallback);
  };

  const uploadFileWithXhr = async (args: {
    method: 'POST' | 'PUT';
    url: string;
    selectedFile: File;
    contentType: string;
    withCredentials?: boolean;
    headers?: Record<string, string>;
  }) => {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(args.method, args.url);
      xhr.withCredentials = !!args.withCredentials;
      xhr.setRequestHeader('Content-Type', args.contentType);

      Object.entries(args.headers ?? {}).forEach(([header, value]) => {
        xhr.setRequestHeader(header, value);
      });

      // this progress path is wired to real object storage upload bytes
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) {
          return;
        }
        const percent = Math.round((event.loaded / event.total) * 100);
        setProgress(percent);
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
          return;
        }
        reject(toXhrError(xhr, `upload failed with status ${xhr.status}`));
      };

      xhr.onerror = () => {
        reject(new Error('upload failed due to a network error'));
      };

      xhr.send(args.selectedFile);
    });
  };

  const uploadFileByPresignedUrl = async (uploadUrl: string, selectedFile: File, contentType: string) => {
    await uploadFileWithXhr({
      method: 'PUT',
      url: uploadUrl,
      selectedFile,
      contentType,
    });
  };

  const uploadFileViaBackendRelay = async (args: {
    submissionId: string;
    storageKey: string;
    selectedFile: File;
    contentType: string;
    csrf: string;
  }) => {
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      throw new Error('service is temporarily unavailable. please try again.');
    }

    const uploadPath = `/api/submissions/${args.submissionId}/upload/file?storageKey=${encodeURIComponent(args.storageKey)}`;

    await uploadFileWithXhr({
      method: 'POST',
      url: `${backendBaseUrl}${uploadPath}`,
      selectedFile: args.selectedFile,
      contentType: args.contentType,
      withCredentials: true,
      headers: {
        'x-csrf-token': args.csrf,
      },
    });
  };

  const createClientRequestId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user || !csrfToken) {
      setErrorMessage('для отправки рукописи требуется авторизация.');
      return;
    }

    if (!isFormValid || !file) {
      setErrorMessage('пожалуйста, заполните все поля и прикрепите корректный pdf перед отправкой.');
      return;
    }

    if (createLockRef.current) {
      return;
    }

    createLockRef.current = true;

    setErrorMessage('');
    setUploadStatus('uploading');
    setProgress(0);

    try {
      const payloadFingerprint = JSON.stringify({
        title: title.trim(),
        keywords: keywords.trim(),
        abstract: abstract.trim(),
        requestedSection,
      });

      if (!idempotencyKeyRef.current || idempotencyFingerprintRef.current !== payloadFingerprint) {
        idempotencyKeyRef.current = createClientRequestId();
        idempotencyFingerprintRef.current = payloadFingerprint;
      }

      const createResponse = await backendRequest<SubmissionCreateResponse>({
        path: '/api/submissions',
        method: 'POST',
        csrfToken,
        body: {
          title,
          keywords,
          abstract,
          requestedSection,
          clientRequestId: idempotencyKeyRef.current,
        },
      });

      const initResponse = await backendRequest<UploadInitResponse>({
        path: `/api/submissions/${createResponse.submission.id}/upload/init`,
        method: 'POST',
        csrfToken,
        body: {
          originalName: file.name,
        },
      });

      try {
        await uploadFileByPresignedUrl(initResponse.uploadUrl, file, initResponse.requiredContentType);
      } catch (directUploadError) {
        const uploadErrorMessage = directUploadError instanceof Error ? directUploadError.message : 'unknown';
        console.warn('[upload] direct upload failed, retrying via backend relay', {
          submissionId: createResponse.submission.id,
          status: uploadErrorMessage,
        });

        await uploadFileViaBackendRelay({
          submissionId: createResponse.submission.id,
          storageKey: initResponse.storageKey,
          selectedFile: file,
          contentType: initResponse.requiredContentType,
          csrf: csrfToken,
        });
      }

      await backendRequest({
        path: `/api/submissions/${createResponse.submission.id}/upload/complete`,
        method: 'POST',
        csrfToken,
        body: {
          storageKey: initResponse.storageKey,
          originalName: file.name,
        },
      });

      setUploadStatus('completed');
      setProgress(100);
      idempotencyKeyRef.current = null;
      idempotencyFingerprintRef.current = null;
    } catch (error) {
      const safeErrorMessage = error instanceof Error ? error.message : 'не удалось отправить рукопись.';
      console.error('[upload] manuscript upload failed', { message: safeErrorMessage });
      setUploadStatus('idle');
      setProgress(0);
      setErrorMessage(safeErrorMessage);
    } finally {
      createLockRef.current = false;
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <p className="text-center text-gray-500">загрузка профиля...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="font-display text-4xl mb-8 text-center">отправить рукопись</h1>

      {!user && (
        <div className="mb-8 border border-accent/40 bg-sepia/30 p-4 text-sm text-gray-700">
          чтобы отправить рукопись, выполните вход через кнопку в шапке сайта.
        </div>
      )}

      <form onSubmit={handleUpload} className="bg-card-bg p-8 border border-sepia shadow-lg">
        <div className="mb-6">
          <label htmlFor={titleId} className="block text-sm font-sans font-bold uppercase tracking-wider mb-2 text-gray-500">название исследования</label>
          <input
            id={titleId}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-lg font-serif border-b-2 border-gray-200 focus:border-accent focus-visible:ring-1 focus-visible:ring-accent outline-none py-2 bg-transparent transition-colors"
            placeholder="например: экономическое влияние шелкового пути"
            required
            minLength={5}
          />
        </div>

        <div className="mb-6">
          <label htmlFor="requested-section" className="block text-sm font-sans font-bold uppercase tracking-wider mb-2 text-gray-500">раздел публикации</label>
          <select
            id="requested-section"
            value={requestedSection}
            onChange={(event) => setRequestedSection(event.target.value as 'journal' | 'research' | 'nova')}
            className="w-full font-serif border-b-2 border-gray-200 focus:border-accent focus-visible:ring-1 focus-visible:ring-accent outline-none py-2 bg-transparent transition-colors"
          >
            <option value="journal">journal</option>
            <option value="research">research</option>
            <option value="nova">nova</option>
          </select>
        </div>

        <div className="mb-6">
          <label htmlFor={keywordsId} className="block text-sm font-sans font-bold uppercase tracking-wider mb-2 text-gray-500">ключевые слова (через запятую)</label>
          <input
            id={keywordsId}
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="w-full font-serif border-b-2 border-gray-200 focus:border-accent focus-visible:ring-1 focus-visible:ring-accent outline-none py-2 bg-transparent transition-colors"
            placeholder="история, экономика, азия..."
            required
          />
        </div>

        <div className="mb-8">
          <label htmlFor={abstractId} className="block text-sm font-sans font-bold uppercase tracking-wider mb-2 text-gray-500">аннотация</label>
          <textarea
            id={abstractId}
            value={abstract}
            onChange={(e) => setAbstract(e.target.value)}
            rows={6}
            className="w-full border-b-2 border-gray-200 bg-transparent py-2 font-serif text-ink transition-colors outline-none focus:border-accent focus-visible:ring-1 focus-visible:ring-accent dark:text-gray-200"
            placeholder="введите аннотацию..."
            required
            minLength={40}
          />
          <p className="mt-2 text-xs text-gray-500">минимум 40 символов.</p>
        </div>

        <div className="mb-8">
          <label htmlFor={fileId} className="block text-sm font-sans font-bold uppercase tracking-wider mb-4 text-gray-500">загрузите pdf</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-accent transition-colors cursor-pointer relative bg-transparent">
            <input
              id={fileId}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              required
            />
            <div className="pointer-events-none">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="mt-2 text-sm text-gray-600 font-sans dark:text-gray-300">
                {file ? file.name : 'перетащите файл или нажмите, чтобы выбрать pdf'}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">только pdf, до {maxFileSizeMb}mb.</p>
          {errorMessage && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          )}
        </div>

        {uploadStatus === 'uploading' && (
          <div className="mb-8">
            <div className="flex justify-between text-xs font-sans uppercase mb-1" aria-live="polite">
              <span>загрузка...</span>
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
            Материал отправлен и загружен
          </p>
        )}

        <button
          type="submit"
          disabled={!isFormValid || uploadStatus === 'uploading' || uploadStatus === 'completed' || !user}
          className="w-full bg-ink text-white py-4 font-sans uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {uploadStatus === 'completed' ? 'материал отправлен' : 'отправить на проверку'}
        </button>
      </form>
    </div>
  );
}
