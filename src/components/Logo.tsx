type LogoProps = {
  className?: string;
  textClassName?: string;
};

export default function Logo({
  className = "",
  textClassName = "text-base font-semibold tracking-tight text-white",
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-sky-300/40 bg-linear-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-[0_10px_24px_rgba(37,99,235,0.35)]">
        <svg
          viewBox="0 0 32 32"
          aria-hidden="true"
          className="brand-logo-icon h-5 w-5 text-white"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10.5 9.3h8.5c2.2 0 4 1.8 4 4v.8c0 2.2-1.8 4-4 4H13.6v5.2h-3.1V9.3Zm3.1 3.1v3.5h5.4a1.8 1.8 0 0 0 0-3.5h-5.4Z"
            fill="currentColor"
            opacity="0.95"
          />
          <path
            d="M18.4 7.4 23.8 12.8l-3.6 3.6-5.4-5.4 3.6-3.6Zm-7.2 15.2 4.2-4.2 3.6 3.5-4.2 4.2c-.8.8-2.2.8-3 0l-.6-.6c-.8-.8-.8-2.2 0-3Z"
            fill="currentColor"
          />
          <path
            d="M8.7 24.7 12 21.4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className={textClassName}>Aksora</span>
    </span>
  );
}
