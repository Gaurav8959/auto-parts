"use client";

import { useLayoutEffect, useRef, useState } from "react";

const A4_WIDTH_PX = 794; // 210 mm at 96 dpi

// Scales the A4 sheet down (never up) to the available width, keeping the layout pixel-identical to print
export function PaperPreview({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ scale: 1, height: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      if (!outer.current || !inner.current) return;
      const scale = Math.min(1, outer.current.clientWidth / A4_WIDTH_PX);
      setBox({ scale, height: inner.current.offsetHeight * scale });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (outer.current) observer.observe(outer.current);
    if (inner.current) observer.observe(inner.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outer} className="w-full" style={{ height: box.height || undefined }}>
      <div
        ref={inner}
        className="origin-top-left overflow-hidden rounded-[3px] shadow-[0_1px_2px_rgba(0,0,0,0.08),0_12px_32px_-8px_rgba(0,0,0,0.18)]"
        style={{ width: A4_WIDTH_PX, transform: `scale(${box.scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
