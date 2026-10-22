import { useState } from "react";
import { renjill, renjillPublished, type RenjillEpisode } from "./content";
import { GoLink, PageHero, SectionTitle, type Nav } from "./shared";

const CHANNEL_NAMES: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", facebook: "Facebook", threads: "Threads" };

/** YouTube は押したときに初めて読み込む（表示速度を落とさない）。IDがない回は埋め込みを出さない */
function Player({ id, title }: { id: string; title: string }) {
  const [on, setOn] = useState(false);
  if (on) {
    return (
      <div className="rj-player">
        <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
      </div>
    );
  }
  return (
    <button type="button" className="rj-player rj-facade" onClick={() => setOn(true)} aria-label={`「${title}」を再生する`}>
      <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" width={480} height={360} />
      <span className="rj-play" aria-hidden="true">▶</span>
    </button>
  );
}

function Episode({ e }: { e: RenjillEpisode }) {
  return (
    <article className="rj-card">
      {e.youtube_id && <Player id={e.youtube_id} title={e.title} />}
      <div className="rj-body">
        <p className="rj-meta">EP.{e.no}　<time dateTime={e.date}>{e.date.replace(/-/g, ".")}</time></p>
        <h3>{e.title}</h3>
        <p>{e.caption_ja}</p>
        <p className="rj-en" lang="en">{e.caption_en}</p>
      </div>
    </article>
  );
}

export function RenjillPage({ navigate }: { navigate: Nav }) {
  const eps = renjillPublished();
  const links = Object.entries(renjill.channels).filter(([, url]) => url) as [string, string][];
  const groups = [
    ...renjill.series.map((s) => ({ id: s.id, title: s.title, items: eps.filter((e) => e.series === s.id) })).filter((g) => g.items.length),
    { id: "", title: "すべてのエピソード", items: eps },
  ];
  return (
    <main>
      <PageHero en="Ren & Jill" title="レンとジル" intro="うさぎの課長レンと、しっかり者の部下ジル。セリフのない、オフィスコメディです。" />
      <section className="section rj-section">
        <div className="container">
          <SectionTitle en="Follow">見られる場所</SectionTitle>
          <ul className="rj-links">
            {links.map(([key, url]) => (
              <li key={key}><a href={url} target="_blank" rel="noopener noreferrer">{CHANNEL_NAMES[key] ?? key}<span className="rj-sr">（新しいタブで開く）</span></a></li>
            ))}
          </ul>
          {groups.map((g) => (
            <div key={g.id || "all"} className="rj-group">
              <h2 className="rj-group-title">{g.title}</h2>
              {g.items.length ? <div className="rj-grid">{g.items.map((e) => <Episode key={e.ep} e={e} />)}</div> : <p>最初のエピソードは、まもなく公開です。</p>}
            </div>
          ))}
          <p className="rj-note">レンとジルは、COANA TOKYO合同会社が制作しています。<GoLink go={navigate} args={["home"]}>COANA TOKYO のサイトへ</GoLink></p>
        </div>
      </section>
    </main>
  );
}
