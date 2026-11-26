"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { photoUrl } from "@/lib/listings";

// Galerie de photos : on fait glisser sur téléphone, flèches et miniatures sur ordinateur
export function Gallery({ photos, title }: { photos: string[]; title: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return <div className="grid aspect-[4/3] place-items-center rounded-2xl bg-surface text-muted sm:aspect-[16/9]">Pas de photo</div>;
  }

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const target = Math.max(0, Math.min(photos.length - 1, i));
    el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="grid gap-3">
      <div className="relative -mx-4 sm:mx-0">
        <div
          ref={track}
          onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] sm:rounded-2xl [&::-webkit-scrollbar]:hidden"
          aria-label="Photos du bien"
        >
          {photos.map((p, i) => (
            <div key={p} className="relative aspect-[4/3] w-full shrink-0 snap-center bg-surface sm:aspect-[16/9]">
              <Image src={photoUrl(p)} alt={`${title} — photo ${i + 1}`} fill priority={i === 0} loading={i === 0 ? undefined : "eager"} sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" />
            </div>
          ))}
        </div>
        {photos.length > 1 && (
          <>
            <span className="absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
              {index + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              aria-label="Photo précédente"
              className="absolute top-1/2 left-3 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl shadow disabled:opacity-0 sm:grid"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              disabled={index === photos.length - 1}
              aria-label="Photo suivante"
              className="absolute top-1/2 right-3 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl shadow disabled:opacity-0 sm:grid"
            >
              ›
            </button>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="hidden gap-2 overflow-x-auto sm:flex">
          {photos.map((p, i) => (
            <button
              key={p}
              type="button"
              onClick={() => go(i)}
              aria-label={`Voir la photo ${i + 1}`}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-surface ring-2 ${i === index ? "ring-brand-500" : "ring-transparent opacity-70 hover:opacity-100"}`}
            >
              <Image src={photoUrl(p)} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
