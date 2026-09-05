"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

const PREVIEW_SIZE = 224;

type Preview = { top: number; left: number; container: Element };

export function HoverImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const ref = useRef<HTMLImageElement>(null);

  function show() {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    // A dialog is promoted to the browser's top layer, above the rest of the page
    // regardless of z-index — portal inside it so the preview isn't hidden behind
    // its own backdrop. Dialogs here are also CSS-transformed for centering, which
    // makes them the containing block for `position: fixed` descendants, so offsets
    // must be relative to the dialog's box instead of the viewport.
    const dialog = el.closest("dialog");
    const container = dialog ?? document.body;
    const containerRect = dialog?.getBoundingClientRect();

    const centeredTop = rect.top + rect.height / 2 - PREVIEW_SIZE / 2;
    const top = Math.min(Math.max(8, centeredTop), window.innerHeight - PREVIEW_SIZE - 8);
    const left =
      rect.right + PREVIEW_SIZE + 8 > window.innerWidth
        ? Math.max(8, rect.left - PREVIEW_SIZE - 8)
        : rect.right + 8;

    setPreview({
      top: top - (containerRect?.top ?? 0),
      left: left - (containerRect?.left ?? 0),
      container,
    });
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={ref} src={src} alt={alt} className={className} onMouseEnter={show} onMouseLeave={() => setPreview(null)} />
      {preview &&
        createPortal(
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            style={{ position: "fixed", top: preview.top, left: preview.left, width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
            className="animate-in pointer-events-none z-50 rounded-xl border border-border object-cover shadow-lg"
          />,
          preview.container
        )}
    </>
  );
}
