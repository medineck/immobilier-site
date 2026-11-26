"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MAX_PHOTOS, PHOTO_BUCKET, photoUrl } from "@/lib/listings";

type Photo = { key: string; path?: string; preview: string; fresh: boolean };

// Réduit la photo (1600 px max) pour un site rapide et un stockage léger
async function shrink(file: File): Promise<{ blob: Blob; ext: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.82));
  const webp = await encode("image/webp");
  if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp" };
  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw new Error("encodage impossible");
  return { blob: jpeg, ext: "jpg" };
}

export function PhotoUploader({ agencyId, initial, onBusyChange }: { agencyId: string; initial: string[]; onBusyChange: (busy: boolean) => void }) {
  const [photos, setPhotos] = useState<Photo[]>(initial.map((p) => ({ key: p, path: p, preview: photoUrl(p), fresh: false })));
  const [error, setError] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef(0);

  const setBusy = (delta: number) => {
    pending.current += delta;
    onBusyChange(pending.current > 0);
  };

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(undefined);
    const room = MAX_PHOTOS - photos.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) setError(`${MAX_PHOTOS} photos maximum par annonce.`);
    const supabase = createClient();

    await Promise.all(
      list.map(async (file) => {
        const key = crypto.randomUUID();
        setPhotos((ps) => [...ps, { key, preview: URL.createObjectURL(file), fresh: true }]);
        setBusy(1);
        try {
          if (!file.type.startsWith("image/")) throw new Error("pas une image");
          const { blob, ext } = await shrink(file);
          const path = `${agencyId}/${key}.${ext}`;
          const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
          if (error) throw error;
          setPhotos((ps) => ps.map((p) => (p.key === key ? { ...p, path } : p)));
        } catch {
          setPhotos((ps) => ps.filter((p) => p.key !== key));
          setError(`« ${file.name} » n’a pas pu être ajoutée. Utilisez une photo JPEG, PNG ou WebP.`);
        } finally {
          setBusy(-1);
        }
      }),
    );
    if (input.current) input.current.value = "";
  }

  function remove(photo: Photo) {
    setPhotos((ps) => ps.filter((p) => p.key !== photo.key));
    // Une photo tout juste ajoutée peut être effacée tout de suite
    if (photo.fresh && photo.path) createClient().storage.from(PHOTO_BUCKET).remove([photo.path]);
  }

  function move(index: number, to: number) {
    setPhotos((ps) => {
      const next = [...ps];
      const [item] = next.splice(index, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  const ready = photos.filter((p) => p.path).map((p) => p.path!);

  return (
    <div className="grid gap-3">
      <input type="hidden" name="photos" value={JSON.stringify(ready)} />
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p, i) => (
            <li key={p.key} className="overflow-hidden rounded-xl border border-line bg-surface">
              <div className="relative aspect-[4/3]">
                {p.path ? (
                  <Image src={photoUrl(p.path)} alt={`Photo ${i + 1}`} fill sizes="(min-width: 640px) 200px, 45vw" className="object-cover" />
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local avant envoi */}
                    <img src={p.preview} alt="" className="size-full object-cover opacity-50" />
                    <span className="absolute inset-0 grid place-items-center text-sm font-medium">Envoi…</span>
                  </>
                )}
                {i === 0 && p.path && (
                  <span className="absolute top-2 left-2 rounded-full bg-white/95 px-2 py-0.5 text-xs font-semibold">Photo principale</span>
                )}
              </div>
              {p.path && (
                <div className="flex items-center justify-between gap-1 p-1.5 text-sm">
                  <span className="flex">
                    <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Déplacer avant" className="rounded-lg px-2 py-1 hover:bg-white disabled:opacity-30">
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, i + 1)}
                      disabled={i === photos.length - 1}
                      aria-label="Déplacer après"
                      className="rounded-lg px-2 py-1 hover:bg-white disabled:opacity-30"
                    >
                      →
                    </button>
                  </span>
                  <button type="button" onClick={() => remove(p)} className="rounded-lg px-2 py-1 font-medium text-red-700 hover:bg-red-50">
                    Retirer
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {photos.length < MAX_PHOTOS && (
        <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-line px-4 py-6 text-center hover:border-brand-500 hover:bg-brand-50">
          <span className="font-semibold text-brand-700">+ Ajouter des photos</span>
          <span className="text-xs text-muted">
            JPEG, PNG ou WebP · {photos.length}/{MAX_PHOTOS} · la première est la photo principale
          </span>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
        </label>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
