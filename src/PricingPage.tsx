import { useMemo, useState } from "react";
import { pagesContent, solutions, inquiryTypeOf } from "./content";
import { ContactBand, FaqSection, GoLink, Icon, PageHero, setInquiryMessage, setInquiryPreset, type Nav } from "./shared";
import { LpIcon } from "./lpIcons";
import "./pricing.css";

/* 料金ページ（2026-11-28 新設：料金を探せず迷って離れる人を減らし、相談前の不安を減らす）
 * 文言は content/pages.json の pricing（金額は各 content/solutions/*.json のプランから自動で集める。ここに金額を書かない）。 */

type Plan = { name: string; price: string; slug: string; service: string; text?: string };
const yen = (n: number) => `${n.toLocaleString("ja-JP")}万円`;
/** "10万円〜＋月5万円〜" → 一括10 / 月5（万円）。「制作費は別」などの注記は無視する */
function parsePrice(price: string) {
  const monthly = /月\s*(\d+(?:\.\d+)?)万円/.exec(price);
  const rest = price.replace(/月\s*\d+(?:\.\d+)?万円〜?/, "");
  const once = /(\d+(?:\.\d+)?)万円/.exec(rest);
  return { once: once ? Number(once[1]) : 0, monthly: monthly ? Number(monthly[1]) : 0 };
}
const shortPrice = (price: string) => price.replace(/（[^）]*）/g, "");

export default function PricingPage({ navigate }: { navigate: Nav }) {
  const p = pagesContent.pricing;
  const jaSolutions = solutions.filter((s) => s.lang !== "en" && (s.plans?.items ?? []).some((i) => i.price));
  const plans: Plan[] = jaSolutions.flatMap((s) =>
    (s.plans?.items ?? []).filter((i) => i.price).map((i) => ({ name: i.name, price: i.price as string, slug: s.slug, service: s.nav_label || s.title, text: i.text })),
  );
  const key = (pl: Pick<Plan, "slug" | "name">) => `${pl.slug}::${pl.name}`;
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (k: string) => setPicked((cur) => (cur.includes(k) ? cur.filter((c) => c !== k) : [...cur, k]));
  const chosen = useMemo(() => plans.filter((pl) => picked.includes(key(pl))), [picked]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = chosen.reduce((acc, pl) => { const v = parsePrice(pl.price); return { once: acc.once + v.once, monthly: acc.monthly + v.monthly }; }, { once: 0, monthly: 0 });
  const find = (slug: string, plan: string) => plans.find((pl) => pl.slug === slug && pl.name === plan);
  const goConsult = (list: Plan[]) => {
    if (list[0]) setInquiryPreset(inquiryTypeOf(solutions.find((s) => s.slug === list[0].slug)!));
    if (list.length) setInquiryMessage("料金のページで、次のプランが気になりました。\n" + list.map((pl) => `・${pl.service}：${pl.name}（${shortPrice(pl.price)}）`).join("\n") + "\n\n詳しい内容と、正式な金額を教えてください。");
    navigate("contact");
  };
  const faqs = (p.faqs ?? []) as { q: string; a: string }[];
  return (
    <main className="pricing-page">
      <PageHero en="Pricing" title={p.title} intro={p.intro} />

      <section className="section pr-points">
        <div className="container">
          <h2 className="pr-h2">{p.points_title}</h2>
          <ul className="pr-point-grid">
            {(p.points as { icon: string; name: string; text: string }[]).map((pt) => (
              <li key={pt.name} className="pr-point" data-reveal>
                <span className="pr-point-icon"><LpIcon name={pt.icon} size={26} /></span>
                <h3>{pt.name}</h3>
                <p>{pt.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section pr-list-section">
        <div className="container">
          <h2 className="pr-h2">{p.list_title}</h2>
          <p className="pr-lead">{p.list_lead}</p>
          <div className="pr-service-grid">
            {jaSolutions.map((s) => (
              <article key={s.slug} className="pr-service" data-reveal>
                <h3>
                  <GoLink go={navigate} args={["solution", undefined, s.slug]}>{s.nav_label || s.title}<Icon name="arrow" size={16} /></GoLink>
                </h3>
                <ul>
                  {(s.plans?.items ?? []).filter((i) => i.price).map((i) => (
                    <li key={i.name}><span className="pr-plan-name">{i.name}</span><span className="pr-plan-price">{shortPrice(i.price as string)}</span></li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section pr-sim" id="simulator">
        <div className="container">
          <h2 className="pr-h2">{p.sim_title}</h2>
          <p className="pr-lead">{p.sim_lead}</p>
          <div className="pr-sim-box">
            <div className="pr-sim-choices">
              {jaSolutions.map((s) => (
                <fieldset key={s.slug} className="pr-sim-group">
                  <legend>{s.nav_label || s.title}</legend>
                  {(s.plans?.items ?? []).filter((i) => i.price).map((i) => {
                    const k = key({ slug: s.slug, name: i.name });
                    return (
                      <label key={k} className={picked.includes(k) ? "pr-check is-on" : "pr-check"}>
                        <input type="checkbox" checked={picked.includes(k)} onChange={() => toggle(k)} />
                        <span className="pr-check-name">{i.name}</span>
                        <span className="pr-check-price">{shortPrice(i.price as string)}</span>
                      </label>
                    );
                  })}
                </fieldset>
              ))}
            </div>
            <aside className="pr-result" aria-live="polite">
              <h3>費用の目安（税別）</h3>
              <dl>
                <div><dt>はじめにかかる費用</dt><dd>{total.once ? `${yen(total.once)}〜` : "—"}</dd></div>
                <div><dt>毎月の費用</dt><dd>{total.monthly ? `${yen(total.monthly)}〜` : "—"}</dd></div>
              </dl>
              {chosen.length === 0 && <p className="pr-result-empty">左のプランを選ぶと、ここに合計が出ます。</p>}
              <button type="button" className="btn btn-primary pr-go" onClick={() => goConsult(chosen)}>{chosen.length ? "この内容で無料相談する" : "まず無料で相談する"}<Icon name="arrow" size={18} /></button>
              <p className="pr-note">{p.sim_note}</p>
            </aside>
          </div>
        </div>
      </section>

      <section className="section pr-examples">
        <div className="container">
          <h2 className="pr-h2">{p.examples_title}</h2>
          <p className="pr-lead">{p.examples_lead}</p>
          <ul className="pr-ex-grid">
            {(p.examples as { name: string; icon: string; items: { slug: string; plan: string }[] }[]).map((ex) => {
              const list = ex.items.map((it) => find(it.slug, it.plan)).filter(Boolean) as Plan[];
              if (!list.length) return null;
              return (
                <li key={ex.name} className="pr-ex" data-reveal>
                  <span className="pr-point-icon"><LpIcon name={ex.icon} size={24} /></span>
                  <h3>{ex.name}</h3>
                  <ul>{list.map((pl) => <li key={key(pl)}><span>{pl.service}：{pl.name}</span><strong>{shortPrice(pl.price)}</strong></li>)}</ul>
                  <button type="button" className="text-link pr-ex-go" onClick={() => goConsult(list)}>この内容で相談する<Icon name="arrow" size={16} /></button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <FaqSection items={faqs} title={p.faq_title} />
      <ContactBand navigate={navigate} big place="pricing_band" />
    </main>
  );
}
