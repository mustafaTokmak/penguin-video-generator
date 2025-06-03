export function LoadingSpinner({
  message = "Loading...",
}: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse" />
        <div className="w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent absolute top-0 left-0" />
      </div>
      <p className="text-lg font-medium text-gray-700 animate-pulse">
        {message}
      </p>
    </div>
  );
}

export function PenguinLoader({
  message = "Penguins are working...",
}: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="text-6xl animate-bounce">🐧</div>
      <p className="text-lg font-medium text-gray-700">{message}</p>
      <div className="flex space-x-1">
        <div
          className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <div
          className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
