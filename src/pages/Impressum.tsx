import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function Impressum() {
  const { settings: s, isLoading } = useSiteSettings([
    "imprint_name","imprint_address","imprint_board","imprint_court","imprint_register",
    "imprint_email","imprint_phone","imprint_vat","imprint_economic_id","imprint_editor","imprint_editor_address","imprint_extra",
  ]);
  return <div className="min-h-screen bg-background"><Navbar /><main className="pt-20">
    <section className="py-20 carnival-gradient text-center text-primary-foreground"><h1 className="text-4xl md:text-6xl font-display font-bold">Impressum</h1></section>
    <article className="container mx-auto px-4 py-12 max-w-3xl space-y-6">
      {isLoading ? <p>Laden...</p> : <>
        <section><h2 className="text-2xl font-display font-bold mb-2">Anbieter</h2>
          <p className="whitespace-pre-line">{s.imprint_name || "K.E.B. e.V."}</p>
          {s.imprint_address && <p className="whitespace-pre-line">{s.imprint_address}</p>}
        </section>
        {s.imprint_board && <section><h2 className="text-xl font-bold mb-2">Vertreten durch den Vorstand gemäß § 26 BGB</h2><p className="whitespace-pre-line">{s.imprint_board}</p></section>}
        <section><h2 className="text-xl font-bold mb-2">Kontakt</h2>
          {s.imprint_email && <p>E-Mail: <a className="text-primary underline" href={`mailto:${s.imprint_email}`}>{s.imprint_email}</a></p>}
          {s.imprint_phone && <p>Telefon: {s.imprint_phone}</p>}
        </section>
        {(s.imprint_court || s.imprint_register) && <section><h2 className="text-xl font-bold mb-2">Vereinsregister</h2><p>{s.imprint_court}</p><p>{s.imprint_register}</p></section>}
        {s.imprint_vat && <p>Umsatzsteuer-Identifikationsnummer: {s.imprint_vat}</p>}
        {s.imprint_economic_id && <p>Wirtschafts-Identifikationsnummer: {s.imprint_economic_id}</p>}
        {s.imprint_editor && s.imprint_editor_address && <section><h2 className="text-xl font-bold mb-2">Verantwortlich nach § 18 Abs. 2 MStV</h2><p>{s.imprint_editor}</p><p className="whitespace-pre-line">{s.imprint_editor_address}</p></section>}
        {s.imprint_extra && <p className="whitespace-pre-line">{s.imprint_extra}</p>}
      </>}
    </article>
  </main><Footer /></div>;
}
