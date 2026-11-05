import assert from "node:assert/strict";
import { test } from "node:test";
import { classify, isSpam, parseMeta, parseNewsSearch, parseRss, titleKey, urlKey } from "../src/lib/news/core.ts";

const RSS = `<?xml version="1.0"?><rss xmlns:media="http://search.yahoo.com/mrss/"><channel>
<item><title><![CDATA[All Blacks name side for Murrayfield test]]></title><link>https://www.rnz.co.nz/news/sport/1?utm_source=rss</link>
<description><![CDATA[<p>Scott Robertson has made three changes &amp; recalled a winger.</p>]]></description>
<pubDate>Mon, 02 Nov 2026 22:15:00 GMT</pubDate><media:content url="https://images.rnz.co.nz/a.jpg" medium="image"/></item>
<item><title>Council approves new cycleway</title><link>https://www.rnz.co.nz/news/national/2</link></item>
</channel></rss>`;

const ATOM = `<feed><entry><title>Warriors sign Kiwis prop for 2027</title><link rel="alternate" href="https://example.com/a"/><updated>2026-11-01T10:00:00Z</updated><summary>NRL news</summary></entry></feed>`;

const GNEWS = `<rss><channel><item><title>Black Caps squad named for India T20s - Stuff</title><link>https://news.google.com/rss/articles/abc</link><pubDate>Tue, 03 Nov 2026 01:00:00 GMT</pubDate><source url="https://www.stuff.co.nz">Stuff</source></item></channel></rss>`;

test("RSS: CDATA, entities, image, date", () => {
  const items = parseRss(RSS, { name: "RNZ" });
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "All Blacks name side for Murrayfield test");
  assert.equal(items[0].summary, "Scott Robertson has made three changes & recalled a winger.");
  assert.equal(items[0].image, "https://images.rnz.co.nz/a.jpg");
  assert.equal(items[0].published_at, "2026-11-02T22:15:00.000Z");
});

test("Atom and news search", () => {
  const a = parseRss(ATOM, { name: "Blog", kind: "blog" });
  assert.equal(a[0].url, "https://example.com/a");
  assert.equal(a[0].kind, "blog");
  const g = parseNewsSearch(GNEWS);
  assert.equal(g[0].title, "Black Caps squad named for India T20s");
  assert.equal(g[0].source, "Stuff");
});

test("sport tagging", () => {
  assert.deepEqual(classify("All Blacks name side for Murrayfield test"), ["all-blacks"]);
  assert.deepEqual(classify("Council approves new cycleway"), []);
  assert.deepEqual(classify("Warriors sign Kiwis prop for 2027 NRL"), ["nrl"]);
  assert.deepEqual(classify("Black Caps squad named for India T20s"), ["cricket"]);
  assert.deepEqual(classify("Crusaders re-sign lock ahead of Super Rugby season"), ["super-rugby"]);
  assert.deepEqual(classify("Wellington Phoenix stun Sydney FC"), ["a-league"]);
  assert.deepEqual(classify("Silver Ferns squad for Constellation Cup"), ["netball"]);
  assert.deepEqual(classify("Melbourne Cup: NZ-bred stayer draws wide"), ["racing"]);
  assert.deepEqual(classify("NZ Breakers beat Perth Wildcats"), ["nbl"]);
  assert.deepEqual(classify("Wembanyama dominates as Spurs roll"), ["nba"]);
  assert.deepEqual(classify("Golden State Warriors win"), []); // not the NZ Warriors, and no NBA marker
  assert.deepEqual(classify("Team news", ["cricket"]), ["cricket"]); // sport-specific feed
  assert.ok(isSpam("Best betting sites and free bets promo code for the Melbourne Cup"));
});

test("dedupe keys and page meta", () => {
  assert.equal(urlKey("https://www.rnz.co.nz/news/sport/1?utm_source=rss#top"), urlKey("https://rnz.co.nz/news/sport/1/"));
  assert.equal(titleKey("Black Caps squad named - Stuff"), titleKey("Black Caps squad named"));
  const m = parseMeta(`<head><meta property="og:title" content="Big win"><meta property="og:image" content="/img/a.jpg"><meta property="og:site_name" content="1News"></head>`, "https://www.1news.co.nz/x");
  assert.equal(m.title, "Big win");
  assert.equal(m.image, "https://www.1news.co.nz/img/a.jpg");
  assert.equal(m.source, "1News");
});

test("Adelaide 36ers stories stay NBL, real NBA stories stay NBA", () => {
  assert.deepEqual(classify("Round 15 | Sixers vs Breakers in the NBL"), ["nbl"]);
  assert.deepEqual(classify("Giddey: 'NBL the perfect pathway to NBA'"), ["nbl"]);
  assert.deepEqual(classify("Sixers head to Darwin for Pre-season NBL Blitz"), ["nbl"]);
  assert.deepEqual(classify("Giannis says Dončić could be best scorer of all time"), ["nba"]);
  assert.deepEqual(classify("Philadelphia 76ers beat the Pistons"), ["nba"]);
  assert.deepEqual(classify("Kiwi NBA hopeful joins the Breakers' NBL squad", ["nbl"]), ["nbl"]);
  assert.deepEqual(classify("Warriors withholding payments to Porzingis", ["nba"]), ["nba"]);
  assert.deepEqual(classify("Warriors sign Kiwis prop for 2027 NRL"), ["nrl"]);
});
