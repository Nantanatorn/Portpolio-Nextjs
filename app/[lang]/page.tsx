import Image from "next/image";
import { notFound } from "next/navigation";
import { DragScroller } from "@/components/DragScroller";
import { Header } from "@/components/Header";
import { PortraitGL } from "@/components/PortraitGL";
import { StackCloud } from "@/components/StackCloud";
import { getDictionary, hasLocale } from "./dictionaries";

const EMAIL = "Nantanatorns.4210@gmail.com";
const PHONE = "(+66) 96-003-4449";
const PHONE_HREF = "+66960034449";
const GITHUB = "https://github.com/Nantanatorn";

const wrap = "mx-auto w-full max-w-7xl px-4 sm:px-6";
const pill =
  "inline-flex items-center gap-2 rounded-full border border-line bg-ink/60 px-3.5 py-1.5 text-sm backdrop-blur";
const tag =
  "rounded-full border border-line bg-ink/60 px-3 py-1 font-mono text-xs text-paper/90";

function Logo({ src, name }: { src: string; name: string }) {
  return (
    <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-white p-1.5">
      {src ? (
        <Image src={src} alt="" width={56} height={56} className="size-full object-contain" />
      ) : (
        <span aria-hidden="true" className="font-display text-xl font-bold text-ink">
          {name[0]}
        </span>
      )}
    </span>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-[clamp(1.7rem,4.2vw,3.8rem)] font-extrabold uppercase leading-[1.05] tracking-tight">
      {children}
    </h2>
  );
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = await getDictionary(lang);
  const allSkills = t.stack.groups.flatMap((g) => g.items);

  return (
    <>
      <Header
        lang={lang}
        nav={t.nav}
        role={t.header.role}
        clock={t.header.clock}
        cta={t.header.cta}
        switchLabel={t.switchLabel}
      />

      <main id="top">
        {/* Hero */}
        <section className={`${wrap} flex min-h-svh flex-col justify-end pb-14 pt-28`}>
          <div className="flex flex-wrap gap-2">
            <span className={pill}>
              <span className="size-2 rounded-full bg-emerald-400" />
              {t.hero.status}
            </span>
            <span className={pill}>{t.hero.location}</span>
          </div>
          <h1 className="mt-6 font-display font-extrabold uppercase leading-[0.95] tracking-tight">
            <span className="block text-[clamp(1.9rem,8vw,7.2rem)]">
              {t.hero.first}
            </span>
            <span className="outline-text block text-[clamp(1.2rem,4.9vw,4.4rem)]">
              {t.hero.last}
            </span>
          </h1>
          <p className="mt-8 max-w-xl text-lg text-paper/90 sm:text-xl">
            <strong className="font-semibold text-paper">{t.hero.role}.</strong>{" "}
            {t.hero.intro}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#projects"
              className="rounded-full bg-paper px-6 py-3 font-semibold text-ink hover:bg-accent"
            >
              {t.hero.ctaWork}
            </a>
            <a
              href="#contact"
              className="rounded-full border border-line bg-ink/60 px-6 py-3 font-semibold backdrop-blur hover:border-accent hover:text-accent"
            >
              {t.hero.ctaContact}
            </a>
          </div>
        </section>

        {/* About */}
        <section id="about" className={`${wrap} py-24 lg:py-32`}>
          <Heading>{t.about.title}</Heading>
          <div className="mt-12 grid gap-10 lg:grid-cols-[24rem_1fr] lg:gap-16">
            <div className="mx-auto w-full max-w-sm lg:max-w-none">
              <PortraitGL src="/nantanatorn.jpg" alt={t.hero.photoAlt} />
            </div>
            <div>
              <p className="max-w-2xl text-2xl font-medium leading-snug sm:text-3xl">
                {t.about.lead}
              </p>
              <div className="mt-8 grid gap-6 text-mist sm:grid-cols-2">
                {t.about.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>

              <dl className="mt-10 grid grid-cols-3 overflow-hidden rounded-2xl border border-line bg-panel/60 backdrop-blur">
                {t.about.stats.map((s, i) => (
                  <div
                    key={s.label}
                    className={`p-5 sm:p-6 ${i > 0 ? "border-l border-line" : ""}`}
                  >
                    <dd className="font-display text-3xl font-bold sm:text-4xl">
                      {s.value}
                    </dd>
                    <dt className="mt-2 text-sm text-mist">{s.label}</dt>
                  </div>
                ))}
              </dl>

              <div className="mt-6 flex gap-5 rounded-2xl border border-line bg-panel/60 p-6 backdrop-blur">
                <Logo src="/logos/kasetsart.png" name="KU" />
                <div>
                  <p className="font-mono text-xs text-mist">
                    {t.about.education.label} · {t.about.education.period}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">
                    {t.about.education.school}
                  </h3>
                  <p className="text-mist">{t.about.education.degree}</p>
                  <p className="mt-2 max-w-xl text-sm text-mist">
                    {t.about.education.note}
                  </p>
                </div>
              </div>

              <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                {t.about.languages.items.map((l) => (
                  <div key={l.name} className="flex gap-2">
                    <dt className="font-semibold">{l.name}</dt>
                    <dd className="text-mist">{l.level}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Experience */}
        <section id="work" className={`${wrap} py-24 lg:py-32`}>
          <Heading>{t.experience.title}</Heading>
          <ol className="mt-12 ml-1 border-l border-line">
            {t.experience.items.map((item) => (
              <li
                key={item.company}
                className="relative grid gap-6 pb-14 pl-6 last:pb-0 sm:pl-10 lg:grid-cols-[18rem_1fr] lg:gap-10"
              >
                <span
                  aria-hidden="true"
                  className="absolute -left-[5px] top-3 size-2.5 rounded-full bg-accent"
                />
                <div>
                  <div className="flex items-center gap-4">
                    <Logo src={item.logo} name="Exzy" />
                    <div>
                      <h3 className="text-xl font-semibold">{item.company}</h3>
                      <p className="mt-1 font-mono text-sm text-mist">
                        {item.period}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`${tag} border-accent/50 text-accent`}>
                      {item.tag}
                    </span>
                    {item.location && <span className={tag}>{item.location}</span>}
                  </div>
                </div>
                <div className="rounded-3xl border border-line bg-panel/60 p-6 backdrop-blur sm:p-8">
                  <h4 className="font-display text-xl font-bold sm:text-2xl">
                    {item.role}
                  </h4>
                  <ul className="mt-5 space-y-3">
                    {item.points.map((p) => (
                      <li key={p} className="flex gap-3">
                        <span aria-hidden="true" className="text-accent">
                          –
                        </span>
                        <span className="text-paper/90">{p}</span>
                      </li>
                    ))}
                  </ul>
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {item.stack.map((s) => (
                      <li key={s} className={tag}>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Stack */}
        <section id="stack" className={`${wrap} py-24 lg:py-32`}>
          <Heading>{t.stack.title}</Heading>
          <div className="mt-12 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="hidden lg:block">
              <StackCloud words={allSkills} />
            </div>
            <div className="rounded-3xl border border-line bg-panel/60 p-6 backdrop-blur sm:p-8">
              {t.stack.groups.map((g, i) => (
                <div
                  key={g.name}
                  className={i === 0 ? "" : "mt-6 border-t border-line pt-6"}
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-lg font-bold">{g.name}</h3>
                    <span className="font-mono text-xs text-mist">
                      {g.items.length}
                    </span>
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {g.items.map((s) => (
                      <li key={s} className={tag}>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Projects */}
        <section id="projects" className="py-24 lg:py-32">
          <div className={`${wrap} flex flex-wrap items-end justify-between gap-4`}>
            <Heading>{t.work.title}</Heading>
            <p className="font-mono text-xs text-mist">{t.work.hint}</p>
          </div>
          <div className="mx-auto mt-12 max-w-[96rem]">
            <DragScroller>
              {t.work.items.map((p) => (
                <article
                  key={p.name}
                  className="flex w-[84vw] shrink-0 snap-start flex-col rounded-3xl border border-line bg-panel/70 p-5 backdrop-blur transition-colors hover:border-accent/50 sm:w-[28rem]"
                >
                  <div className="relative grid h-44 place-items-center overflow-hidden rounded-xl border border-line bg-ink/60">
                    <span
                      aria-hidden="true"
                      className="outline-text select-none font-display text-4xl font-extrabold sm:text-5xl"
                    >
                      {p.mark}
                    </span>
                    <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 font-mono text-xs font-semibold text-ink">
                      {p.year}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-bold">
                    {p.name}
                  </h3>
                  <p className="mt-3 text-mist">{p.summary}</p>
                  <ul className="mt-auto flex flex-wrap gap-2 pt-5">
                    {p.stack.map((s) => (
                      <li key={s} className={tag}>
                        {s}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </DragScroller>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className={`${wrap} py-24 lg:py-32`}>
          <Heading>{t.contact.title}</Heading>
          <p className="mt-8 max-w-xl text-lg text-paper/90">{t.contact.lead}</p>
          <a
            href={`mailto:${EMAIL}`}
            className="mt-6 inline-block break-all font-display text-[clamp(1.1rem,3.4vw,2.8rem)] font-bold text-accent underline decoration-line underline-offset-8 hover:decoration-accent"
          >
            {EMAIL}
          </a>
          <dl className="mt-12 grid gap-6 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-mist">{t.contact.phoneLabel}</dt>
              <dd>
                <a href={`tel:${PHONE_HREF}`} className="hover:text-accent">
                  {PHONE}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-mist">{t.contact.githubLabel}</dt>
              <dd>
                <a
                  href={GITHUB}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent"
                >
                  github.com/Nantanatorn
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-mist">{t.contact.locationLabel}</dt>
              <dd>{t.contact.location}</dd>
            </div>
          </dl>
        </section>
      </main>

      <footer className="border-t border-line/60 pb-24 pt-8 text-center text-sm text-mist md:pb-8">
        {t.footer}
      </footer>
    </>
  );
}
