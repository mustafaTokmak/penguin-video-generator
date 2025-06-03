import { useEffect, useState } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  className = "",
  width,
  height,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    const img = new Image();

    const handleLoad = () => {
      setImageSrc(src);
      setIsLoading(false);
      setHasError(false);
      onLoad?.();
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
      onError?.();
    };

    img.addEventListener("load", handleLoad);
    img.addEventListener("error", handleError);

    img.src = src;

    return () => {
      img.removeEventListener("load", handleLoad);
      img.removeEventListener("error", handleError);
    };
  }, [src, onLoad, onError]);

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ width, height }}
      >
        <div className="text-center p-4">
          <p className="text-red-600 mb-2">Failed to load image</p>
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              setHasError(false);
              const img = new Image();
              img.onload = () => {
                setImageSrc(src);
                setIsLoading(false);
              };
              img.onerror = () => {
                setIsLoading(false);
                setHasError(true);
              };
              img.src = src;
            }}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg animate-pulse ${className}`}
        style={{ width, height }}
      >
        <LoadingSpinner message="Loading image..." />
      </div>
    );
  }

  return (
    <img
      src={imageSrc || ""}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading="lazy"
    />
  );
}
