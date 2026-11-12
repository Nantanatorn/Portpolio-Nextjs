import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CvViewer } from "@/components/desk/CvViewer";
import { RoomProjects } from "@/components/desk/RoomProjects";
import { RoomTour } from "@/components/desk/RoomTour";
import { Header } from "@/components/Header";
import { StackExplorer } from "@/components/StackExplorer";
import { getDictionary, hasLocale } from "../../dictionaries";

// Prototype of the whole page as one 3D room. Not linked from the site.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const EMAIL = "Nantanatorns.4210@gmail.com";
const PHONE = "(+66) 96-003-4449";
const PHONE_HREF = "+66960034449";
const GITHUB = "https://github.com/Nantanatorn";
const CV = "/Nantanatorn-CV.pdf";

const title =
  "font-display text-[clamp(1.5rem,2.6vw,2.2rem)] font-extrabold uppercase leading-[1.05] tracking-tight";
const tag =
  "rounded-full border border-line bg-ink/60 px-3 py-1 font-mono text-xs text-paper/90";
const button =
  "inline-flex items-center gap-2 rounded-full border border-line bg-ink/60 px-4 py-2 text-sm font-semibold hover:border-accent hover:text-accent";

export default async function RoomPrototype({
  params,
}: PageProps<"/[lang]/lab/room">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = await getDictionary(lang);
  const article = t.writing.items[0];

  const data = {
    screen: { first: t.hero.first, last: t.hero.last, role: t.hero.role },
    cards: t.experience.items.map((x) => ({
      company: x.company,
      role: x.role,
      period: x.period,
      logo: x.logo,
    })),
    groups: t.stack.groups,
    projects: t.work.items.map((p) => ({ name: p.name, image: p.image })),
    article: article
      ? { title: article.title, date: article.date, author: "Nantanatorns", image: article.image }
      : undefined,
    contact: {
      card: {
        name: `${t.hero.first} ${t.hero.last.slice(0, 1)}.`,
        role: t.hero.role,
        email: EMAIL,
        phone: PHONE,
      },
      terminal: {
        command: "contact --open-to-work",
        rows: [
          ["status", t.hero.status],
          ["email", EMAIL],
          ["phone", PHONE],
          ["github", "github.com/Nantanatorn"],
          ["cv", "./Nantanatorn-CV.pdf"],
        ] as [string, string][],
      },
      cv: CV,
      key: lang === "th" ? "คลิก" : "Click",
      prompt: lang === "th" ? "อ่าน CV ของผม" : "Read my CV",
    },
    about: {
      photo: "/nantanatorn.jpg",
      school: t.about.education.school,
      degree: t.about.education.degree,
      period: t.about.education.period,
      gpa: t.about.stats.find((x) => x.value.includes("."))?.value ?? "",
      logo: "/logos/kasetsart.png",
    },
  };

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
      <main>
        <RoomTour
          data={data}
          hero={
            <>
              <h1 className="sr-only">
                {t.hero.first} {t.hero.last}
              </h1>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-ink/60 px-3.5 py-1.5 font-mono text-xs backdrop-blur">
                prototype · room tour
              </span>
              <p className="mt-6 max-w-xl text-lg text-paper/90 sm:text-xl">
                <strong className="font-semibold text-paper">
                  {t.hero.role}.
                </strong>{" "}
                {t.hero.intro}
              </p>
              <p className="mt-6 font-mono text-xs text-mist">scroll ↓</p>
            </>
          }
          panels={[
            {
              id: "about",
              side: "right",
              content: (
                <>
                  <h2 className={title}>{t.about.title}</h2>
                  <p className="mt-5 text-lg font-medium leading-snug">
                    {t.about.lead}
                  </p>
                  {t.about.body.map((p) => (
                    <p key={p} className="mt-3 text-sm text-mist">
                      {p}
                    </p>
                  ))}
                  <dl className="mt-6 grid grid-cols-3 overflow-hidden rounded-2xl border border-line">
                    {t.about.stats.map((s, i) => (
                      <div
                        key={s.label}
                        className={`p-4 ${i > 0 ? "border-l border-line" : ""}`}
                      >
                        <dd className="font-display text-2xl font-bold">
                          {s.value}
                        </dd>
                        <dt className="mt-1 text-xs text-mist">{s.label}</dt>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-6 border-t border-line pt-5">
                    <p className="font-mono text-xs text-mist">
                      {t.about.education.label} · {t.about.education.period}
                    </p>
                    <h3 className="mt-2 font-semibold">
                      {t.about.education.school}
                    </h3>
                    <p className="text-sm text-mist">
                      {t.about.education.degree}
                    </p>
                    <p className="mt-2 text-sm text-mist">
                      {t.about.education.note}
                    </p>
                  </div>
                  <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    {t.about.languages.items.map((l) => (
                      <div key={l.name} className="flex gap-2">
                        <dt className="font-semibold">{l.name}</dt>
                        <dd className="text-mist">{l.level}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              ),
            },
            {
              id: "work",
              side: "right",
              content: (
                <>
                  <h2 className={title}>{t.experience.title}</h2>
                  {t.experience.items.map((item) => (
                    <article
                      key={item.company}
                      className="mt-6 border-t border-line pt-6"
                    >
                      <p className="font-mono text-xs text-mist">
                        {item.period}
                      </p>
                      <h3 className="mt-2 font-display text-lg font-bold">
                        {item.role}
                      </h3>
                      <p className="text-mist">{item.company}</p>
                      <ul className="mt-4 space-y-2 text-sm">
                        {item.points.map((p) => (
                          <li key={p} className="flex gap-3">
                            <span aria-hidden="true" className="text-accent">
                              –
                            </span>
                            <span className="text-paper/90">{p}</span>
                          </li>
                        ))}
                      </ul>
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {item.stack.map((s) => (
                          <li key={s} className={tag}>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </>
              ),
            },
            {
              id: "stack",
              side: "left",
              content: (
                <>
                  <h2 className={`${title} mb-6`}>{t.stack.title}</h2>
                  <StackExplorer groups={t.stack.groups} cloud={false} />
                </>
              ),
            },
            {
              id: "projects",
              side: "right",
              content: (
                <>
                  <h2 className={title}>{t.work.title}</h2>
                  <RoomProjects
                    items={t.work.items}
                    repoLabel={t.work.repoLabel}
                    hint={
                      lang === "th"
                        ? "กดเลือกโปรเจกต์เพื่อดูภาพบนจอ"
                        : "Pick a project to see it on the monitor."
                    }
                  />
                </>
              ),
            },
            {
              id: "writing",
              side: "left",
              content: (
                <>
                  <h2 className={title}>{t.writing.title}</h2>
                  {t.writing.items.map((a) => (
                    <article
                      key={a.url}
                      className="mt-6 border-t border-line pt-6"
                    >
                      <p className="font-mono text-xs text-mist">
                        <time>{a.date}</time>
                      </p>
                      <h3 className="mt-2 font-display text-xl font-bold leading-tight">
                        {a.title}
                      </h3>
                      <p className="mt-3 text-sm text-mist">{a.summary}</p>
                      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={button}
                        >
                          {a.read}
                          <span className="sr-only">: {a.title}</span>
                          <span aria-hidden="true">↗</span>
                        </a>
                        <a
                          href={a.alt.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-mist underline decoration-line underline-offset-4 hover:text-accent"
                        >
                          {a.alt.label}
                        </a>
                      </div>
                    </article>
                  ))}
                </>
              ),
            },
            {
              id: "contact",
              side: "left",
              content: (
                <>
                  <h2 className={title}>{t.contact.title}</h2>
                  <p className="mt-4 text-paper/90">{t.contact.lead}</p>
                  <a
                    href={`mailto:${EMAIL}`}
                    className="mt-5 inline-block break-all font-display text-xl font-bold text-accent underline decoration-line underline-offset-8 hover:decoration-accent"
                  >
                    {EMAIL}
                  </a>
                  <div className="mt-6">
                    <a
                      href={CV}
                      download="Nantanatorn-CV.pdf"
                      className={button}
                    >
                      {t.contact.cvLabel}
                    </a>
                  </div>
                  <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-mist">{t.contact.phoneLabel}</dt>
                      <dd>
                        <a
                          href={`tel:${PHONE_HREF}`}
                          className="hover:text-accent"
                        >
                          {PHONE}
                        </a>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-mist">{t.contact.githubLabel}</dt>
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
                  </dl>
                </>
              ),
            },
          ]}
        />
      </main>
      <CvViewer
        src={CV}
        filename="Nantanatorn-CV.pdf"
        labels={
          lang === "th"
            ? { close: "ปิด", download: "ดาวน์โหลด", title: "CV ของ Nantanatorn" }
            : { close: "Close", download: "Download", title: "Nantanatorn's CV" }
        }
      />
    </>
  );
}
