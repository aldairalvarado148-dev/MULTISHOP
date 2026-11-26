"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Banner } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const total = banners.length;

  useEffect(() => {
    if (total <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % total), 6000);
    return () => clearInterval(timer);
  }, [total]);

  if (total === 0) return null;
  const active = banners[Math.min(index, total - 1)];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[rgba(176,38,255,0.25)]">
      <div className="relative min-h-[210px] sm:min-h-[280px]">
        {banners.map((banner, i) => (
          <div
            key={banner.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              i === index ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {banner.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={banner.image_url}
                alt={banner.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(176,38,255,0.55),rgba(10,5,20,0.95))]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(5,2,10,0.92)] via-[rgba(5,2,10,0.55)] to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center gap-2 p-5 sm:p-9">
              <h2 className="max-w-lg text-xl font-black leading-tight text-white sm:text-3xl">
                {banner.title}
              </h2>
              {banner.subtitle && (
                <p className="max-w-md text-xs text-[#d6c6ef] sm:text-sm">{banner.subtitle}</p>
              )}
              {banner.link_url && (
                <Link
                  href={banner.link_url}
                  className="btn btn-primary mt-2 w-fit text-xs sm:text-sm"
                >
                  {banner.cta_label || "Ver más"}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {total > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ir al banner ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-6 bg-[#c77dff]" : "w-1.5 bg-white/35",
              )}
            />
          ))}
        </div>
      )}
      <span className="sr-only">{active.title}</span>
    </div>
  );
}
