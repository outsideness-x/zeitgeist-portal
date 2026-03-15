"use client";

const MAX_UPLOAD_SIZE_BYTES = 12 * 1024 * 1024;
const MAX_DIMENSION_PX = 512;
const OUTPUT_QUALITY = 0.9;

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
        return;
      }
      reject(new Error('Не удалось прочитать файл.'));
    };
    reader.onerror = () => reject(new Error('Не удалось прочитать файл.'));
    reader.readAsDataURL(file);
  });
};

const loadImage = (dataUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Не удалось обработать изображение.'));
    image.src = dataUrl;
  });
};

export const prepareAvatarDataUrl = async (file: File): Promise<string> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Можно загрузить только изображение.');
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error('Файл слишком большой. Максимум 12 MB.');
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  const sourceImage = await loadImage(sourceDataUrl);

  const sourceWidth = sourceImage.naturalWidth || sourceImage.width;
  const sourceHeight = sourceImage.naturalHeight || sourceImage.height;

  if (!sourceWidth || !sourceHeight) {
    throw new Error('Не удалось определить размер изображения.');
  }

  const maxSide = Math.max(sourceWidth, sourceHeight);
  const scale = maxSide > MAX_DIMENSION_PX ? MAX_DIMENSION_PX / maxSide : 1;

  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Не удалось подготовить изображение.');
  }

  context.drawImage(sourceImage, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL('image/jpeg', OUTPUT_QUALITY);
};
