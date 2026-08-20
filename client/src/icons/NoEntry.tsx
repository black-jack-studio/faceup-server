import * as React from "react";
import noEntryImage from "@assets/no_entry_3d_1787280000000.png";

export type NoEntryProps = {
  size?: number;         // px
  className?: string;    // tailwind etc.
};

export default function NoEntry({ size = 24, className = "" }: NoEntryProps) {
  return (
    <img
      src={noEntryImage}
      alt="Leave"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
