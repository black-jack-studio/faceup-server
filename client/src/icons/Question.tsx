export default function Question({ className = "w-6 h-6", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" {...props}>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M9.09 9C9.32 8.47 9.77 8.06 10.33 7.91C10.89 7.75 11.49 7.87 11.95 8.22C12.41 8.57 12.66 9.1 12.66 9.67C12.66 10.23 12.41 10.76 11.95 11.11C11.49 11.46 10.89 11.58 10.33 11.43"
        fill="none"
        stroke="rgba(0,0,0,0.8)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="16"
        r="0.5"
        fill="rgba(0,0,0,0.8)"
      />
      <circle
        cx="12"
        cy="12"
        r="7"
        fill="rgba(255,255,255,0.1)"
        stroke="none"
      />
    </svg>
  );
}