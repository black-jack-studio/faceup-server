export default function Star({ className = "w-6 h-6", ...props }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" className={className} {...props}>
      <path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8L6.6 20l1-6-4.4-4.3 6.1-.9L12 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}