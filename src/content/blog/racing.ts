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

You can try the maths on our free [betting odds calculator](/tools/betting-odds-calculator), or see fair chances on every New Zealand race in [Quick Read Racing](/racing).
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
  {
    slug: "melbourne-cup-2026-betting-guide-nz",
    zone: "racing",
    featured: true,
    title: "Melbourne Cup 2026: a stats guide for Kiwi punters",
    seoTitle: "Melbourne Cup 2026 Betting Guide NZ | Field, Weights & Stats",
    description: "The 2026 Melbourne Cup on Tuesday 3 November: NZ start time, how the handicap works, the market leaders, NZ-bred runners, last year's result and the stats that matter for a 3200m race.",
    date: "2026-10-30",
    keywords: ["Melbourne Cup 2026", "Melbourne Cup NZ time", "Melbourne Cup betting", "Melbourne Cup field", "Melbourne Cup tips"],
    body: `
The race that stops two nations is on **Tuesday 3 November 2026** at Flemington. It's traditionally run at 3pm Melbourne time, around 5pm in New Zealand. Here's how to approach it with numbers rather than names out of a hat.

## The race

- **Distance:** 3200 metres, the longest major race on the calendar.
- **Type:** a handicap. Better-rated horses carry more weight to even up the field.
- **Field:** up to 24 runners.
- **Prize money:** A$10 million in 2025, with A$4.5 million to the winner.

## Last year

**Half Yours** won the 2025 Cup by about three lengths at $8, from barrier 8 with 53kg. It was trained by Tony and Calvin McEvoy and ridden by **Jamie Melham**, the first woman to win the race since Michelle Payne in 2015. Goodie Two Shoes ran second and Middle Earth third, and both are in the likely 2026 field.

## The 2026 market

At the time of writing (30 October), the field is still provisional and the barrier draw is to come. The market is led by **Point Of Law** (Ciaron Maher, Ethan Brown) and **Trustyourinstinct** (Joseph O'Brien, James McDonald), with Hopewell Rock, Defiantly and Shockletz among the next in betting. Prices will move a lot after the draw and as scratchings come in.

Two runners carry the (NZ) suffix, meaning they were bred in New Zealand: **Shockletz** and **Asterix**.

## Stats that matter over 3200m

- **Weight:** in a handicap this long, a lighter weight helps, but class still matters. Compare each horse's weight with its staying form rather than backing the lightest. Half Yours carried 53kg.
- **Barrier:** in a 24-horse field a wide draw costs ground. Middle barriers have the best balance. Very wide draws need a horse that can settle back and get a run.
- **Staying form:** look for horses that have won or run close over 2400m or further. Many Cup runners have never been beyond 2500m.
- **Lead-up runs:** the Caulfield Cup, Moonee Valley Cup and Geelong Cup are the main guides. A horse that ran on strongly in one is worth noting.
- **Breeding:** most of the field is bred in the Northern Hemisphere — the (GB), (IRE) and (FR) suffixes — many of them now trained in Australia. A European staying pedigree is the norm, not an edge.

## Bet types

- **Win:** with 24 runners, even the favourite is usually only around a 15% chance.
- **Each way:** the race pays places down to fourth or further with many bookmakers on Cup day. Check the terms before you bet.
- **Exotics:** trifectas and first fours pay huge dividends, but they're lotteries. Keep stakes small.

## On the day

Quick Read's [racing section](/racing) lists Australian meetings as well as New Zealand ones, so you can open the Cup race card for fields, weights, barriers, fixed odds, price moves and each runner's fair chance with the margin removed.

Bet for fun, not to fix your finances. If it stops being fun, call the Gambling Helpline on 0800 654 655.
`,
  },
  {
    slug: "barrier-draws-nz-racing",
    zone: "racing",
    title: "Barrier draws in NZ racing: when the draw matters and when it doesn't",
    seoTitle: "Barrier Draws Explained | NZ Horse Racing Betting Guide",
    description: "Why inside barriers help in sprints and big fields, when a wide draw is no problem, and how to factor the draw into your betting on New Zealand racing.",
    date: "2026-10-27",
    keywords: ["barrier draw", "horse racing barriers", "inside draw", "NZ racing tips", "wide barrier"],
    body: `
The barrier is the stall a horse starts from, with 1 closest to the inside rail. It can be worth lengths, or almost nothing.

## When the draw matters most

- **Short races.** Over 1000–1400m there's little time to recover from a wide start. Inside and middle draws are usually an advantage.
- **Short run to the first turn.** At some tracks the field reaches a bend soon after the start. Wide runners either use energy crossing over or get stuck three or four wide.
- **Big fields.** In a field of 16 or more, the outside barriers face the most traffic and the most ground lost.

## When it matters less

- **Staying races.** Over 2000m and beyond, there's time to find cover.
- **Small fields.** With seven or eight runners, a wide draw rarely means trouble.
- **Leaders with speed.** A horse that can jump fast and lead can overcome a wide draw. Its jockey will push forward early.
- **Backmarkers.** Horses that settle near the rear and run home late aren't hurt much by a wide gate.

## Harness racing

In mobile-start harness races, front-line draws, especially inside ones, are a major advantage. Back-line horses rely on the driver to find a trail. See our [harness racing guide](/blog/harness-racing-betting-nz-guide).

## How to use it

1. Check the barrier against the race distance and the field size.
2. Ask how the horse races: leader, on-pacer or backmarker?
3. Look at the track. On a rain-affected track, inside ground can get chewed up and the draw can matter less, or even swap.

Quick Read race cards show every runner's barrier next to its number, with jockey and trainer form alongside. See [today's NZ races](/racing).
`,
  },
  {
    slug: "apprentice-jockeys-claims-nz-racing",
    zone: "racing",
    title: "Apprentice jockeys and claims in NZ racing: are they worth backing?",
    seoTitle: "Apprentice Jockey Claims Explained | NZ Racing Betting",
    description: "What an apprentice's claim like (a2) means, why trainers use claiming riders, and how to judge whether a claim is a real advantage when you bet.",
    date: "2026-10-27",
    keywords: ["apprentice jockey", "apprentice claim", "jockey claim NZ", "a2 claim meaning", "NZ jockey stats"],
    body: `
On a race card you'll often see a jockey listed with something like **(a2)** or **(a1.5)**. That's an apprentice's claim, and it can be one of the best value angles in racing.

## What the claim means

Apprentice jockeys are allowed to reduce the weight their horse carries. The number is the reduction in kilograms. A horse allotted 58kg ridden by an (a2) apprentice carries 56kg. The claim shrinks as the apprentice rides more winners, until they ride without one.

## Why it matters

In handicaps, weight is how the field is evened up. A good apprentice on a well-rated horse cancels part of that handicap. Two kilograms over a mile is often reckoned at about a length.

## When it's a real advantage

- **The apprentice is riding well.** Check their strike rate over the last 30–90 days. A claim is only worth something if the rider isn't costing more than the weight saves.
- **Top stables use them.** Leading trainers often put their stable apprentice on horses they think are well placed. A good stable-apprentice partnership is worth noting.
- **Heavier topweights.** The claim matters most on horses at the top of the weights.

## When it isn't

- **Very inexperienced riders** in big, rough fields, where race craft matters more than weight.
- **Weight-for-age or set-weight races**, where the conditions already level things up differently.

## Find the in-form apprentices

Our [jockey leaderboard](/racing/jockeys) ranks every New Zealand rider by wins, strike rate and level-stakes profit over 30 days, 90 days and 12 months. Each jockey's page shows their record by price range, trainer and track, so you can see who is getting the best rides.
`,
  },
  {
    slug: "nz-racing-class-ratings-explained",
    zone: "racing",
    title: "Racing classes in NZ explained: maidens, ratings bands and Group races",
    seoTitle: "NZ Horse Racing Classes Explained | Maiden, Rating 65, Group 1",
    description: "What maiden, rating-band, Open, Listed and Group races are in New Zealand thoroughbred racing, and why a horse rising or dropping in class matters when you bet.",
    date: "2026-10-26",
    keywords: ["NZ racing classes", "maiden race", "rating 65 race", "Group 1 racing NZ", "class drop horse racing"],
    body: `
A horse's last start only tells you so much without knowing what grade it was in. Class is one of the most underrated parts of form.

## The ladder

- **Maiden:** for horses that haven't won a race. Fields are often uneven, and first-starters can be hard to assess.
- **Rating bands:** horses are given a rating based on their results. Races are written for bands, shown on cards as Rating 65, Rating 75 and so on. Higher numbers mean better horses.
- **Open handicaps:** for the better horses outside the black-type races.
- **Listed races:** the first level of "black type" races, which add value for breeding.
- **Group 3, Group 2, Group 1:** the elite level. Group 1 races are the biggest prizes of the season.

## Rising and dropping in class

- **Dropping in class** (say, from a Group race back to an Open handicap) is often a positive. The horse meets weaker opponents.
- **Rising in class** after a win is a test. Some horses step up; many find the next level too hard first time.
- **Ratings creep.** A horse that keeps winning gets re-rated upwards and carries more weight in handicaps, so its winning run often ends.

## Weight conditions

- **Handicaps:** weight is set by rating. Better horses carry more.
- **Weight-for-age:** weight depends on age and sex, not rating. The best horse usually wins.
- **Set weights:** everyone carries the same, with allowances for sex and sometimes age.

## Using it

Read the race name on the card, then look at what class each horse's recent runs were in. A third placing in a Group race can be better form than a win in a lower rating band.

Every Quick Read race card shows the race name and class, distance and track rating, alongside each runner's recent form. Open [today's races](/racing).
`,
  },
  {
    slug: "horse-racing-blackbook-tracking-guide",
    zone: "racing",
    title: "How to keep a racing blackbook: tracking horses, jockeys and trainers",
    seoTitle: "Racing Blackbook Guide | Track Horses, Jockeys & Trainers NZ",
    description: "What to put in a racing blackbook, which horses deserve a note, and how to get alerted when a tracked horse, jockey or trainer has a runner in New Zealand racing.",
    date: "2026-10-26",
    keywords: ["racing blackbook", "horse tracker", "track horses NZ", "follow jockey", "horse racing alerts"],
    body: `
A blackbook is a list of horses, and people, you want to follow. It's how good punters remember the horse that was unlucky last Saturday when it turns up at a big price three weeks later.

## Which horses to note

- **Unlucky runs.** Held up for a run, checked, raced wide without cover, or had a bad draw but still ran on.
- **Strong late sections.** A horse that finished fifth but ran home faster than the winner.
- **First-up and second-up patterns.** Some horses always need a run; others go best fresh.
- **Track and distance specialists.** A horse with three wins at one track is worth watching when it returns there.
- **Wet-trackers.** Horses with good form on Soft and Heavy ground, for when the rain comes. See our [track conditions guide](/blog/nz-track-conditions-good4-soft6-heavy9-explained).

## Jockeys and trainers too

Track the people who are in form. A trainer whose strike rate has jumped over the last month, or an apprentice getting better rides, will produce winners before the market catches up. Our [jockey and trainer strike rate guide](/blog/jockey-trainer-strike-rates-nz-racing) explains what to look for.

## Keep it short

A blackbook of 200 horses is a list nobody reads. Keep it to horses you'd actually back, and remove them once they've won or let you down a couple of times.

## Using Quick Read's tracker

Tap **+ Track** on any horse, jockey, driver or trainer page. **My tracking** then shows:

- every tracked runner in a published field, with the race, time and price;
- their latest results from the past two weeks;
- each horse's recorded form by track condition and distance.

[Start your blackbook](/racing/tracking).
`,
  },
];
