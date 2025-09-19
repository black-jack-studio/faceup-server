import ticketImage from "@assets/admission-ticket_1758215281205.png";

interface TicketProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

export function Ticket({ size = 48, className = "", glow = false }: TicketProps) {
  return (
    <img 
      src={ticketImage} 
      alt="Ticket" 
      className={`${className} ${glow ? 'drop-shadow-lg' : ''}`}
      style={{ 
        width: size, 
        height: size,
        filter: glow ? 'drop-shadow(0 0 8px rgba(255, 105, 180, 0.6))' : 'none'
      }}
    />
  );
}