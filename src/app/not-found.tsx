import Link from "next/link";

export const instant = false;

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-2xl mb-4 border border-slate-300 dark:border-zinc-700">
        🔍
      </div>
      <h1 className="text-2xl font-black text-gray-900 dark:text-slate-100 mb-2">
        Page Not Found
      </h1>
      <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mb-6">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
