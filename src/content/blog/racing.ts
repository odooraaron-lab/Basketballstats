import type { Post } from "./types";

export const racing: Post[] = [
  {
    slug: "how-to-read-nz-horse-racing-form-guide",
    zone: "racing",
    featured: true,
    title: "How to read a New Zealand horse racing form guide",
    seoTitle: "How to Read a NZ Horse Racing Form Guide | Race Card Explained",
    description: "Barriers, weights, apprentice claims, form figures, track ratings and the market: a plain-English guide to reading a New Zealand race card before you bet.",
    date: "2026-10-30",
    keywords: ["NZ horse racing form", "how to read a form guide", "race card explained", "horse racing tips NZ", "TAB form guide"],
    body: `
A race card packs a lot into a few lines. Once you know what each number means, you can rule half the field in or out in a couple of minutes. Here's how to read a New Zealand card, from the top.

## The race itself

Start with the conditions, because they decide which form matters:

- **Distance.** A horse that wins at 1200m isn't automatically a 2000m horse. Look for wins or close finishes at a similar trip.
- **Track rating.** New Zealand uses the same scale as Australia: Firm 1–2, Good 3–4, Soft 5–7 and Heavy 8–10, plus Synthetic. More in our [track conditions guide](/blog/nz-track-conditions-good4-soft6-heavy9-explained).
- **Class.** Maidens (horses yet to win), rating bands like Rating 65 or Rating 75, then Listed and Group races at the top. A horse dropping in class is often worth a second look.

## Each runner's line

- **Number and barrier.** The saddlecloth number is mostly about weight order in handicaps. The barrier (the number in brackets) is where the horse jumps from. Inside draws help in big fields and short races, especially at tracks with a short run to the first turn.
- **Weight.** Higher-rated horses carry more in handicaps. Watch for big weight drops from the last start.
- **Jockey and claim.** An apprentice's claim, such as (a2), takes that many kilograms off the horse's weight. A good apprentice on a well-weighted horse is a classic angle.
- **Trainer.** Some stables are in form, some aren't. Strike rates over the last 30–90 days tell you which (see our [jockey and trainer guide](/blog/jockey-trainer-strike-rates-nz-racing)).
- **Form figures.** Read right to left: the last digit is the most recent run. 1 is a win, 2 is second and so on, 0 means unplaced (10th or worse), and x marks a spell.

## The market

Fixed odds tell you what the betting market thinks. A $3.00 horse is rated about a 33% chance before the bookmaker's margin. Add up 1 ÷ price for every runner and you'll usually get 115–125%. That extra is the margin. Removing it gives each horse's fair chance, which Quick Read shows next to every price.

Moves matter too. A horse that has firmed from $8 to $5 has had money for it. One that's drifted from $4 to $7 has been opposed. Neither is a guarantee, but both are information. See [market moves explained](/blog/horse-racing-market-moves-firming-drifting).

## Putting it together

1. Does the horse have form at this distance and on this track rating?
2. Is it well weighted compared with its last few runs?
3. Are the jockey and trainer going well right now?
4. Is the price longer than the horse's real chance?

If the answer to the last one is no, there's no bet, however good the horse looks. [Quick Read's racing section](/racing) puts all four on one screen for every New Zealand thoroughbred and harness race.
`,
  },
  {
    slug: "jockey-trainer-strike-rates-nz-racing",
    zone: "racing",
    title: "Jockey and trainer strike rates in NZ racing: how to use them",
    seoTitle: "Jockey & Trainer Strike Rates NZ | Racing Stats That Find Value",
    description: "Win %, place % and level-stakes profit for jockeys, drivers and trainers: what the numbers mean, how big a sample you need, and how to use them on race day.",
    date: "2026-10-30",
    keywords: ["jockey strike rate", "trainer strike rate", "NZ jockey stats", "harness driver stats", "level stakes profit"],
    body: `
Every punter knows the top jockeys. The trick is knowing who is riding well *right now*, and whose winners are actually paying. That's what strike rates and level-stakes profit tell you.

## The three numbers that matter

- **Win strike rate.** Wins ÷ rides. Across a typical New Zealand meeting the average is somewhere around one in ten, because the average field has about ten runners. A jockey or trainer at 18–20% over a decent sample is doing something right.
- **Place strike rate.** Top-three finishes ÷ rides. Useful for place and each-way betting.
- **Level-stakes profit.** If you'd put $1 on every ride at the fixed price, how much would you be up or down? This is the one that finds value. A popular jockey can win plenty of races and still lose money if everyone already backs them.

## Sample size

Twenty rides tell you almost nothing. A 25% strike rate from 20 rides could easily be luck. As a rough guide:

- **Under 30 rides:** treat as a hint only.
- **50–100 rides:** worth weighing alongside other form.
- **200+ rides:** a reliable picture of how a jockey or stable is going.

Quick Read shows strike rates over the last 30 days, 90 days and 12 months, so you can see whether a hot streak is new or long-running.

## Combinations

Some jockey–trainer pairings win far more often together than apart. Stables put their best rider on their best-prepared horses. On every [jockey](/racing/jockeys) and [trainer](/racing/trainers) page we split results by partner, track and price range, so you can spot a pairing that keeps landing.

## Price bands

Split a jockey's rides by starting price:

- **Up to $3:** do their favourites actually win as often as they should?
- **$6–$12:** are they getting value horses home?
- **Over $12:** a profitable longshot record is rare and worth noting.

## Harness drivers

In harness racing the driver has even more say: when to go forward, when to sit parked, when to pull out. Driver strike rates are often higher than gallops jockeys' because fields are smaller and form is more reliable. The same rules apply: big sample, level-stakes profit, and form over the last month.

## On race day

1. Open the race and check each runner's jockey and trainer strike rate for the last 90 days.
2. Look for a strong rider on a horse at a price the market hasn't caught up with.
3. Check the [track conditions](/blog/nz-track-conditions-good4-soft6-heavy9-explained) and distance form before you commit.

Strike rates won't pick winners on their own, but they'll stop you backing a stable that's gone cold.
`,
  },
  {
    slug: "nz-track-conditions-good4-soft6-heavy9-explained",
    zone: "racing",
    title: "NZ track conditions explained: Good4, Soft6, Heavy9 and what they mean for betting",
    seoTitle: "NZ Track Conditions Explained | Good4 Soft6 Heavy9 Ratings",
    description: "New Zealand's track rating scale (Firm, Good, Soft, Heavy, Synthetic), why it changed in 2022, and how to use a horse's wet or dry form when you bet.",
    date: "2026-10-29",
    keywords: ["NZ track ratings", "track conditions horse racing", "Good4 meaning", "Heavy track form", "wet track horses"],
    body: `
The track rating is one of the biggest form factors in New Zealand racing, especially through winter and spring when tracks can swing from Good to Heavy in a day.

## The scale

Since April 2022, New Zealand has used the same track ratings as Australia:

- **Firm 1–2:** hard, fast ground. Rare in NZ outside summer.
- **Good 3–4:** the standard racing surface.
- **Soft 5–7:** some give in the ground; times slow down.
- **Heavy 8–10:** wet, testing ground that suits stayers and genuine mudlarks.
- **Synthetic:** all-weather tracks, which race very differently to turf.

Before the change, NZ had its own scale, which included a Heavy 11 and a "Slow" band. Old form lines from before 2022 can look different for that reason. The numbers line up with penetrometer readings, which measure how far a probe sinks into the ground.

## Why it matters

Some horses handle wet ground and some don't. A horse with three wins on Soft and nothing on Good could be a very different chance if it rains. Our horse pages split every recorded start by track condition, so you can see that straight away.

## How to use it

1. **Check the latest rating.** Clubs update it through the morning and between races. A rating that drifts from Good4 to Soft6 changes the race.
2. **Look at wet form, not just wins.** A horse that ran a close second on Heavy has shown it can handle it.
3. **Watch the market.** Wet-track horses often firm once rain sets in. If you've done the work early, you'll have the better price.
4. **Be wary of first-time wet runners.** No form on the surface means more risk, whatever the price.

## Breeding and style

Some sire lines are known for handling wet ground, and horses with a round, choppy action often cope better than long-striding types. That's harder to measure, so we stick to what the results show: how each horse has actually run on each surface.

Every New Zealand race card in [Quick Read Racing](/racing) shows the track rating at the top, and every horse page breaks down results by condition and distance.
`,
  },
  {
    slug: "win-vs-place-betting-nz-racing",
    zone: "racing",
    title: "Win vs place betting in NZ racing: places paid, fair odds and finding value",
    seoTitle: "Win vs Place Betting NZ | How Many Places Paid & Fair Odds",
    description: "How many places the TAB pays, how to work out a horse's fair win and place chance from the odds, and when a place bet is better value than the win.",
    date: "2026-10-29",
    keywords: ["place betting NZ", "win or place", "each way betting NZ", "fair odds horse racing", "TAB place dividends"],
    body: `
A place bet feels safer than a win bet, and it is. But "safer" isn't the same as "better value". Here's how to tell the difference.

## How many places are paid

On the TAB the usual rule is:

- **8 or more starters:** three places paid.
- **5 to 7 starters:** two places paid.
- **4 or fewer:** win only.

Scratchings can change the number of places, so check the final field. Quick Read shows "places paid" at the top of every race card.

## Turning odds into chances

A fixed price of $4.00 implies a 25% chance (1 ÷ 4). But add up the implied chances of every runner and you'll get more than 100%, often 115–125% in New Zealand win markets. That extra is the bookmaker's margin.

To get a fair chance, divide each runner's implied chance by the total. A $4.00 horse in a 120% market has a fair chance of about 21%, so its fair price is about $4.80.

Place markets work the same way, but the total should be close to 100% × the number of places paid. Quick Read does this for you and shows each runner's win and place chance next to its price.

## When the place bet is the better bet

- **Short-priced favourites.** A $1.80 favourite often pays only $1.10–$1.20 to place. The win bet usually holds more value.
- **Consistent horses at good prices.** A horse that places often but rarely wins can be good value to place, especially in big fields.
- **Wide-open races.** When five or six horses all have a chance, the place market can price the best of them generously.

## Each-way

An each-way bet is a win bet plus a place bet of the same stake. It suits horses in the $6–$15 range that you think will run well but may not win. At very short prices, each-way bets rarely make sense.

## The simple test

For any bet, compare your price with the fair price. If the bookmaker's price is longer than the fair price, there's value. If not, there isn't, whether it's win, place or each-way.

You can try the maths on our free [betting odds calculator](/#calculator), or see fair chances on every New Zealand race in [Quick Read Racing](/racing).
`,
  },
  {
    slug: "horse-racing-market-moves-firming-drifting",
    zone: "racing",
    title: "Horse racing market moves: what firming and drifting really tell you",
    seoTitle: "Firming & Drifting Horses Explained | Racing Market Moves NZ",
    description: "Why prices move before a race, what a firming or drifting horse is telling you, and how to use market moves without chasing every plunge.",
    date: "2026-10-28",
    keywords: ["horse racing market moves", "firming horse", "drifting horse", "racing flucs", "betting plunge NZ"],
    body: `
Racing prices move all morning. Some moves mean something; plenty don't. Here's how to read them.

## The words

- **Firming:** a horse's price is shortening because money is coming for it, e.g. $8 → $5.
- **Drifting:** a horse's price is lengthening because the market is opposing it, e.g. $4 → $7.
- **Flucs:** the list of prices a horse has traded at.

## Why prices move

1. **Money.** Bookmakers shorten horses that are being backed to limit their exposure.
2. **Information.** Trackwork, a gear change, a jockey switch or a track rating change can all shift opinion.
3. **Scratchings.** When a fancied runner comes out, everyone else's price shortens.

## Reading a move

- **A firm from long odds** ($15 → $8) is often more meaningful than a favourite going from $2.40 to $2.20.
- **Late moves** in the last 10–15 minutes are usually stronger signals than early ones.
- **Moves with a reason** (rain for a wet-tracker, a top jockey booked) are easier to trust than moves without one.

## The trap

Market moves tell you what other people think. If you only bet horses that are firming, you're always taking the worse price. The value is in getting on *before* the move, which means doing the form yourself.

## How Quick Read shows it

Every runner on our race cards shows its opening and current price, and we flag horses that have firmed or drifted significantly. Combine that with jockey and trainer form and the horse's [track and distance record](/blog/nz-track-conditions-good4-soft6-heavy9-explained), and you'll know whether a move makes sense.

[See today's NZ races](/racing).
`,
  },
  {
    slug: "harness-racing-betting-nz-guide",
    zone: "racing",
    title: "Harness racing betting in New Zealand: drivers, draws and starts",
    seoTitle: "Harness Racing Betting NZ | Trotting & Pacing Form Guide",
    description: "Mobile vs standing starts, front-line and back-line draws, driver form and how to read harness form when betting on New Zealand trotting and pacing.",
    date: "2026-10-28",
    keywords: ["harness racing NZ", "trotting betting", "pacing form guide", "Addington harness", "harness driver stats"],
    body: `
New Zealand harness racing has a big, loyal betting following, and it rewards punters who understand how the races are run.

## Pacers and trotters

Pacers move both legs on the same side together; trotters move diagonal legs together. They race separately. Trotters are more prone to breaking gait (galloping), which costs ground and can see a runner put out of contention, so reliability matters even more.

## Mobile vs standing starts

- **Mobile starts:** the field is released behind a moving gate. Draw is important, and front-line draws, especially inside ones, are an advantage.
- **Standing starts:** horses start from a standstill in handicapped positions. Some horses are reliable from a stand and some aren't, so check past standing-start form.

## Draws

Harness fields line up in a front line and a back line. A good front-line draw usually means an easier run. A back-line draw means relying on the driver to find cover or make a move. Some tracks favour leaders more than others.

## Drivers matter

The driver decides when to go forward, when to sit "in the trail" behind the leader, and when to make the move three wide. Top drivers win at a much higher rate than average, and that shows in strike rates. Our [jockeys and drivers page](/racing/jockeys) lets you filter to harness only.

## Reading harness form

- Look for horses that have been **finishing strongly** from back in the field. They're often better than their finishing positions suggest.
- Note **gear changes** and **gait breaks** in recent runs.
- Check how a horse goes from **its draw and start type** in this race.

## Bet with the numbers

[Quick Read Racing](/racing) covers every New Zealand harness meeting with fields, prices, results, driver and trainer strike rates, and each horse's recorded form.
`,
  },
];
