// Anatole's own pasted reference ("Star 9") — fill="currentColor" instead of the original's
// hardcoded #000000, matching every other icon in this folder, so it can be colored via a
// parent's text-* class (e.g. Profile's Game Stats cards, which want it to match the stat's
// own title color) instead of always rendering black.
export default function Sparkle({ className = "w-6 h-6", ...props }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" className={className} {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.25 0.843567L14.5981 6.33103L20.1388 4.11121L17.9189 9.65183L23.4064 12L17.9189 14.3481L20.1388 19.8888L14.5981 17.6689L12.25 23.1564L9.90183 17.6689L4.36121 19.8888L6.58103 14.3481L1.09357 12L6.58103 9.65183L4.36121 4.11121L9.90183 6.33103L12.25 0.843567ZM12.25 4.6564L10.7043 8.26846L7.05729 6.80729L8.51846 10.4543L4.9064 12L8.51846 13.5456L7.05729 17.1927L10.7043 15.7315L12.25 19.3436L13.7956 15.7315L17.4427 17.1927L15.9815 13.5456L19.5936 12L15.9815 10.4543L17.4427 6.80729L13.7956 8.26846L12.25 4.6564Z"
        fill="currentColor"
      />
    </svg>
  );
}
