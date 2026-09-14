import Image from "next/image";

export function BannerHero({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string | null;
}) {
  return (
    <div className="relative isolate overflow-hidden rounded-lg border border-border bg-card">
      <Image
        src="/img/banner.png"
        alt=""
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 1024px"
        className="object-cover"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-40 max-w-2xl flex-col justify-center p-5 md:min-h-52 md:p-7">
        <p className="text-xs font-semibold tracking-wide text-brand-orange uppercase">
          Dashboard
        </p>
        <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-white md:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-white/85">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
