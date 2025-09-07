export default function Home({ className = "w-6 h-6", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M3 9L12 2L21 9V20C21 21.1 20.1 22 19 22H5C3.9 22 3 21.1 3 20V9Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 22V12H15V22"
        fill="rgba(0,0,0,0.2)"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 2L3 9H21L12 2Z"
        fill="rgba(255,255,255,0.1)"
        stroke="none"
      />
    </svg>
  );
}