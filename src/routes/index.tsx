import { createFileRoute, Link } from "@tanstack/react-router";
import { FileLock2, Fingerprint, MapPin, ShieldCheck, Waves } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sākṣya — Secure Case Evidence & Investigation Management" },
      {
        name: "description",
        content:
          "Sākṣya gives authorised investigators one secure workspace for evidence, statements, people, vehicles, locations and case timelines.",
      },
      { property: "og:title", content: "Sākṣya — Secure Case Evidence Management" },
      {
        property: "og:description",
        content:
          "Chain-of-custody ready evidence management: uploads, timelines, people, vehicles, locations and full audit history.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: FileLock2,
    title: "Evidence vault",
    body: "Audio, FIR reports, statements, documents and lawfully obtained call metadata — stored privately with signed, expiring access links.",
  },
  {
    icon: Waves,
    title: "Case timeline",
    body: "Incidents, statements, recordings and uploads assemble into one chronological view of the investigation.",
  },
  {
    icon: Fingerprint,
    title: "People & vehicles",
    body: "Structured records for suspects, victims, witnesses and vehicles, each linked to the evidence that supports them.",
  },
  {
    icon: MapPin,
    title: "Location mapping",
    body: "Tie evidence and people to places, with an authorised-only map view of where case events occurred.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="font-display text-lg font-semibold tracking-tight">Sākṣya</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Investigator sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10 md:pt-20">
        <p className="label-caps">Case evidence & investigation management</p>
        <h1 className="mt-4 max-w-3xl text-4xl leading-tight font-semibold md:text-6xl">
          Every piece of evidence, accounted for.
        </h1>
        <p className="mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
          Sākṣya is a restricted workspace for authorised investigators: upload and organise case
          evidence, connect it to people, vehicles and locations, and keep a permanent audit trail of
          every access.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Enter the case room</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth" search={{ mode: "signup" } as never}>
              Request investigator access
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-20 md:grid-cols-2">
        {features.map((f) => (
          <article key={f.title} className="panel p-6">
            <f.icon className="h-5 w-5 text-primary" />
            <h2 className="mt-4 text-xl font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </article>
        ))}
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground">
          Sensitive case material is never exposed publicly. Call records and personal data must only
          be stored when lawfully obtained and authorised.
        </div>
      </footer>
    </main>
  );
}
