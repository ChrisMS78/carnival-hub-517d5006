import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const sections = [
 ["Hosting und Server-Protokolle",["privacy_hosting","privacy_logs_retention","privacy_hosting_transfers"]],
 ["Kontaktformular und E-Mail",["privacy_contact","privacy_contact_retention"]],
 ["Benutzerverwaltung und Cookies",["privacy_accounts","privacy_security","privacy_accounts_retention"]],
 ["Veranstaltungsfotos",["privacy_photos","privacy_photos_basis"]],
 ["Externe Links und Schriftarten",["privacy_external"]],
 ["Datensicherung",["privacy_backup","privacy_backup_retention"]],
 ["Ihre Rechte",["privacy_rights"]],
 ["Datenschutzbeauftragter",["privacy_dpo"]],
 ["Weitere Informationen",["privacy_extra"]],
] as const;
export default function Datenschutz() {
 const {settings:s,isLoading}=useSiteSettings(["imprint_name","imprint_address","imprint_email","imprint_phone",...sections.flatMap(([,keys])=>[...keys])]);
 return <div className="min-h-screen bg-background"><Navbar/><main className="pt-20">
  <section className="py-20 carnival-gradient text-center text-primary-foreground"><h1 className="text-4xl md:text-6xl font-display font-bold">Datenschutzerklärung</h1></section>
  <article className="container mx-auto px-4 py-12 max-w-3xl space-y-7">
   {isLoading?<p>Laden...</p>:<>
    <section><h2 className="text-xl font-bold mb-2">Verantwortlicher</h2><p>{s.imprint_name||"K.E.B. e.V."}</p><p className="whitespace-pre-line">{s.imprint_address}</p>{s.imprint_email&&<p>E-Mail: <a className="underline text-primary" href={`mailto:${s.imprint_email}`}>{s.imprint_email}</a></p>}{s.imprint_phone&&<p>Telefon: {s.imprint_phone}</p>}<Link to="/impressum" className="underline text-primary">Weitere Angaben im Impressum</Link></section>
    {sections.map(([title,keys])=>keys.some(k=>s[k])&&<section key={title}><h2 className="text-xl font-bold mb-2">{title}</h2>{keys.map(k=>s[k]&&<p key={k} className="whitespace-pre-wrap mb-2">{s[k]}</p>)}</section>)}
    <a href="https://www.ldi.nrw.de/" target="_blank" rel="noopener noreferrer" className="underline text-primary">Datenschutzaufsicht Nordrhein-Westfalen</a>
   </>}
  </article>
 </main><Footer/></div>;
}
