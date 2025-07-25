
export interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  quality: number;
}

export async function compressImage(
  file: File,
  options: Partial<CompressionOptions> = {}
): Promise<File> {
  const defaultOptions: CompressionOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: false,
    quality: 0.8
  };

  const finalOptions = { ...defaultOptions, ...options };

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const { width, height } = img;
      const { maxWidthOrHeight } = finalOptions;

      let { width: newWidth, height: newHeight } = img;

      if (width > height) {
        if (width > maxWidthOrHeight) {
          newWidth = maxWidthOrHeight;
          newHeight = (height * maxWidthOrHeight) / width;
        }
      } else {
        if (height > maxWidthOrHeight) {
          newHeight = maxWidthOrHeight;
          newWidth = (width * maxWidthOrHeight) / height;
        }
      }

      canvas.width = newWidth;
      canvas.height = newHeight;

      ctx?.drawImage(img, 0, 0, newWidth, newHeight);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        file.type,
        finalOptions.quality
      );
    };

    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}
