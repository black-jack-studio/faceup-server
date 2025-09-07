export default function Lightning({ className = "w-6 h-6", ...props }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" className={className} {...props}>
      <path d="M13 2L4.09 12.97c-.21.26-.02.6.33.6H9l-2 8 8.91-10.97c.21-.26.02-.6-.33-.6H11l2-8z" 
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" 
            fill="currentColor" opacity="0.9"/>
      <path d="M13 2L9 10h4.33c.35 0 .54.34.33.6L11 14" 
            stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}