import type { ErrorResponse } from "@remix-run/node";
import { isRouteErrorResponse, useRouteError } from "@remix-run/react";

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return <RouteErrorBoundary error={error} />;
  }

  if (error instanceof Error) {
    return <GeneralErrorBoundary error={error} />;
  }

  return <UnknownErrorBoundary />;
}

function RouteErrorBoundary({ error }: { error: ErrorResponse }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-400 via-red-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl max-w-lg w-full">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-red-600 mb-4">
            {error.status}
          </h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            {error.statusText}
          </h2>
          {error.data && (
            <p className="text-gray-600 mb-6">{String(error.data)}</p>
          )}
          <a
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            🐧 Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}

function GeneralErrorBoundary({ error }: { error: Error }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-400 via-red-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl max-w-lg w-full">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-600 mb-4">
            Oops! Something went wrong
          </h1>
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-6 text-left">
            <p className="text-red-700 font-mono text-sm">{error.message}</p>
          </div>
          <p className="text-gray-600 mb-6">
            Our penguins are working hard to fix this issue!
          </p>
          <a
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            🐧 Try Again
          </a>
        </div>
      </div>
    </div>
  );
}

function UnknownErrorBoundary() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-400 via-red-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl max-w-lg w-full">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-600 mb-4">
            Unknown Error
          </h1>
          <p className="text-gray-600 mb-6">
            An unexpected error occurred. Please try again later.
          </p>
          <a
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            🐧 Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
