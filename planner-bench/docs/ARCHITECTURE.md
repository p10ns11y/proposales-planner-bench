# Architecture

The bench takes a brief, confirms it, and ranks venues. Instants and `today` are UTC. The screen turns each stored date into a weekday and a month with `Date.UTC`. `expires_at` seconds become a UTC instant. A row expires when that date is before `today`. Brief clocks stay `HH:MM`.

## System

```mermaid
flowchart LR
  browser[Browser]
  app["Next.js app on Vercel"]
  api["Proposales API, v1 and v3"]
  model["xAI model via the AI SDK"]
  browser -->|"session and turn"| app
  app -->|"reads and filing"| api
  app -->|"AI SDK"| model
```

![System context](diagrams/system-context.svg)

The same picture is the System context page of [diagrams/architecture.tldr](diagrams/architecture.tldr).

The browser runs `PlannerSession` from `planner-bench`. On Vercel that directory is the project root. Each post sends the action, and the snapshot when the page has one.

## Request

```mermaid
sequenceDiagram
  participant Browser
  participant Session as GET /api/session
  participant Turn as POST /api/turn
  participant API as Proposales
  participant Model as xAI

  Browser->>Session: open
  Session->>API: GET /v3/companies
  API-->>Session: companies, or a throw
  Session-->>Browser: 200, phase capture
  Browser->>Turn: action and snapshot
  Note over Turn,Model: Only capture, a gap answer, or a results revision, and only with XAI_API_KEY
  Turn->>Model: generateObject, 40 s, low effort
  Model-->>Turn: patch, or a miss
  Turn-->>Browser: 200, snapshot and planner
```

A company-list failure still returns 200: no companies, `filingAvailable` false, notice `Filing is unavailable right now.` A missing snapshot loads the session again. `today` is `new Date().toISOString().slice(0, 10)`.

Turn and chat set `maxDuration` to 60. The page calls session and turn. It does not call chat. Chat streams a reply, a snapshot, and a `data-offer-group` part. The tools `updateBrief`, `fileBrief`, `addOffer`, and `compareOffers` run the scripted turn. A stream failure, including the 40 second abort, falls back to that turn. The shell builds the same part locally.

A line that asks what this is sets `This finds a place for an event. Say the city, when it is, and how many people.` A line outside the planner sets `This bench finds a place for an event.` The phase stays.

## Screen

```mermaid
flowchart TD
  capture[capture] -->|brief text| confirm[confirm]
  confirm -->|questionForGap| confirm
  confirm -->|Yes, on Does this brief look right?| favorites[favorites]
  favorites -->|Any reply. Harbour House, Ridge Hall, and Canal Loft match.| results[results]
  results -->|open a card| detail[detail]
  detail -->|close, offer query cleared| results
  results -->|an edit that opens a gap| confirm
  capture -->|file| filing[file, phase stays]
  confirm -->|file| filing
  favorites -->|file| filing
  results -->|file| filing
  detail -->|email set| filing
  detail -->|no email| askEmail["More. Email focused. No server call."]
```

Detail sits over the thread and returns to the same place in the chat. Saving More while that detail is open leaves the same offer open. The favorite mark does not change the sort. Post rules are in [Filing](#filing).

![Turn sequence](diagrams/turn-sequence.svg)

The same picture is the Turn sequence page of [diagrams/architecture.tldr](diagrams/architecture.tldr).

A comparable brief needs a city, a start date, a start time, an attendee count, and an end time. The end time can be absent when a duration is set, or when the end date is after the start date. Favorites asks `Which places do you already have in mind? You can skip.`

`MoreDrawer` edits event name, organisation, email, language, rooms, meeting rooms, food, notes, and budget. Apply sends `moreEdited` for the fields that changed. The budget field is labeled `Budget (EUR)` and writes `budgetMinor`. It does not set `budget.scope`. Speech uses the browser speech API when the browser has it. Typing always works. Compare shows for two or three visible offers when that group is at least 640 pixels wide. Show more adds five rows. History stays in `localStorage`.

## Budget

```mermaid
flowchart TD
  bare{budget set, and scope missing?}
  bare -->|yes| hold["Stay on confirm. Ask: Is that per person or total? The Yes button stays hidden."]
  bare -->|no| kind{Ceiling}
  kind -->|per-person| heads{Attendees above zero?}
  heads -->|no| none[No ceiling]
  heads -->|yes| pp["Minor units times the attendee count"]
  kind -->|total| tot[Minor units]
  kind -->|no budget object| minor["budgetMinor, and only then"]
  pp --> same{Same currency, and the total is above the ceiling?}
  tot --> same
  same -->|yes| over[Over budget]
  minor --> above{Total above budgetMinor? No currency check.}
  above -->|yes| over
```

Minor units are the major amount times 100, rounded. Per person, pp, and each set `budget.scope` to `per-person`. Total sets `total`. The scripted reader also accepts per head, per attendee, per guest, and a head as per-person, and in total and overall as total. An answer calls `readBudgetScope` first, so those words set the basis on either path. A stated basis skips the question. The word yes does not.

## Extraction

```mermaid
flowchart TD
  words[Capture, gap answer, or results revision] --> key{XAI_API_KEY set?}
  key -->|no| scripted["extractBriefPatch. No model call. planner scripted. 200"]
  key -->|yes| gen["generateObject on the Vercel AI SDK, xAI provider. briefExtractionSchema stores timeAssumption.dayPart only, and has no budgetMinor."]
  gen --> modelId["grok-4.7, or PLANNER_MODEL. Low effort. Abort at 40 s."]
  modelId --> result{Patch passes plannerBriefSchema?}
  result -->|no, or the call throws| scripted
  result -->|yes| merge["Scripted field wins. A model field stays when the script left it unset."]
  merge --> modelPath["planner model. 200"]
```

Confirm, favorites, show more, and opening a row leave `planner` as `scripted`. An English brief with no stated language is stored as `en`. The rule is in [Filing](#filing). The prompt says to leave unknown fields out. `assumedSpan` fills the clocks and the statement. Full day and all day are 09:00–17:00. Half day and morning are 09:00–12:00. Afternoon is 13:00–17:00.

A scripted budget with the same amount and currency, and no basis, keeps the basis the model set. The brief keeps its span on `timeAssumption`. Offer day parts are separate, and they do not filter or rank: `full_day`, `half_day_morning`, `half_day_afternoon`, `evening`, `overnight`, `multi_day`.

## Rank

```mermaid
flowchart TD
  city{Either city blank?}
  city -->|yes| people{Attendee count set?}
  city -->|no| fold["Trim, lower case, strip accents"]
  fold --> sameCity{Same city?}
  sameCity -->|no| drop[Drop the offer]
  sameCity -->|yes| people
  people -->|no| keep[Keep the offer]
  people -->|under a set minimum, or over a set maximum| drop
  people -->|within the bounds the offer sets| keep
  keep --> stated{budget.currency set?}
  stated -->|yes| lead["That currency leads. EUR brief: every EUR row before every SEK row. SEK brief: SEK first."]
  stated -->|no| few["Fewest gaps pick the lead. Equal gaps: currency A to Z, so EUR before SEK, then the lower total. Fewer SEK gaps lead even when the total is larger."]
  lead --> inside["Inside one currency: fewer gaps, then the lower total. No conversion."]
  few --> inside
  inside --> best["Best match: first row that is not expired. If none, bestNonExpiredIndex is -1. An expired row can still sort first."]
```

## Not stated

```mermaid
flowchart TD
  brief[Brief] --> rooms{Breakout count stated?}
  rooms -->|no| chipRooms["Card and detail. Text: Not stated. Name: Breakout not stated. neutral, not a gap."]
  rooms -->|yes, and the offer is short| gapRooms[Gap: breakout]
  brief --> diets{A diet is named?}
  diets -->|no| chipDiet["Card and detail. Text: Not stated. Name: Diet not stated. neutral, not a gap."]
  diets -->|yes, and the offer misses it| gapDiet[Gap: that diet name]
```

## Where the code lives

```mermaid
flowchart LR
  subgraph appBox ["src/app"]
    page[planner-session]
    sessionRoute[api/session]
    turnRoute[api/turn]
    chatRoute[api/chat]
  end
  subgraph flowBox ["src/flow"]
    handler[planner-turn]
    chatFlow[planner-chat]
    viewport[viewport-turn]
    extract[agent-mode]
    stage[brief-flow]
  end
  subgraph domainBox ["src/domain"]
    briefNode[planner-brief]
    rankNode[compare-offers]
    fitNode[fitness]
  end
  subgraph ioBox ["src/proposales"]
    clientPick[client.ts]
    http[http-client]
    fixture[fixture-client]
    fileNode[filing]
  end
  subgraph viewBox ["src/views"]
    shell[planner-shell]
    detailNode[offer-detail]
    drawer[more-drawer]
  end
  page --> sessionRoute
  page --> turnRoute
  sessionRoute --> clientPick
  turnRoute --> handler
  handler --> viewport
  handler --> extract
  handler --> clientPick
  chatRoute --> chatFlow
  chatFlow --> extract
  chatFlow --> clientPick
  viewport --> briefNode
  viewport --> rankNode
  viewport --> stage
  rankNode --> fitNode
  viewport --> fileNode
  clientPick --> http
  clientPick --> fixture
  shell --> detailNode
  shell --> drawer
```

```mermaid
flowchart TB
  shell["Chat shell"]
  more["More drawer"]
  detail["Detail view"]
  part["data-offer-group"]
  render["renderPart"]
  cards["Offer cards"]
  domain["Fitness"]
  rank["Compare and rank"]
  shell --> part --> render --> cards
  shell --> detail
  shell --> more
  rank --> domain
```

`renderPart` takes that part plus `hiddenCount`, `openName`, `onOpen`, and `onShowMore`, and draws `OfferGroupCard`.

`mergeBrief` lets a set field on the patch replace the old one. A patch that touches the clock replaces `timeAssumption`, and can clear it. Food requests merge meal and diets, and set `foodRequired` when it was unset. Diet names map to one spelling. The merge stores budget currency in upper case. Fitness uses `makeConditionalSchemaTransformer` from `@adaptate/core`.

`normaliseProposal` sums each block's package split times its quantity into rooms, food, space, and extras. It uses `value_without_tax` when that value is present, and `value_with_tax` otherwise. It drops a trailing ` (demo venue)` from the title.

## Offers and failures

```mermaid
flowchart TD
  mode{"PROPOSALES_MODE"} -->|live| live["HTTP client"]
  mode -->|anything else| fixture["Fixture client"]
  live -->|rows| rows["Venue proposals"]
  live -->|empty, or the load throws| sample["Sample offers"]
  text["Capture, gap answer, or results revision"] -->|key set| model["Model planner, 40 s"]
  text -->|no key| scripted["Scripted patch"]
  model -.->|miss| scripted
  keys["API keys"] --> server["Server-side requests"]
```

```mermaid
flowchart TD
  mode{PROPOSALES_MODE}
  mode -->|anything but live, including unset| quiet["Fixture rows. No source chip."]
  mode -->|live| search["GET /v3/proposal-search?limit=25"]
  search --> skip["Skip data.planner_bench_brief. Fetch the rest five at a time."]
  skip --> envelope{Envelope reads?}
  envelope -->|one draft fails| drop["Drop that draft. Keep the others."]
  envelope -->|the rest| norm{Each remaining draft normalises?}
  drop --> norm
  norm -->|one fails| sample["Replace the whole list. Sample offers."]
  norm -->|all pass| liveRows[Live offers]
  search -->|empty, or the load throws| sample
  readers["companyReader, rfpReader, draftReader, proposalEnvelopeReader, searchEnvelopeReader, searchIdentityReader. Null inbox token. data stays unknown."] --> search
  ua["User agent planner-bench/0.1.0"] --> search
```

Normalisation copies city, capacity, `min_capacity`, `day_part`, and `event_type` when they parse. `XAI_API_KEY` and `PROPOSALES_API_KEY` stay on the server. Requests that send the API key also send the bearer. The model key goes to the xAI provider. The turn JSON returns the snapshot and `planner`. Each company in that snapshot is id and name.

| What happens | Status |
| --- | --- |
| Invalid JSON. `request.json()` throws on turn and on chat. Neither route catches it. | 500 |
| The snapshot fails its schema. `parse` throws. | 500 |
| Live mode and an empty key. `createClient` throws on session, turn, and chat. | 500 |
| The turn body is not a JSON object, or the action is unknown. | 400 |
| Missing key, model error, or the 40 second timeout. | 200, `planner` is `scripted` |
| Company lookup throws while the session opens. | 200. Ranking still runs. Notice: `Filing is unavailable right now.` |
| The turn status failed, the snapshot fails to parse, or the fetch throws. | The browser shows `Couldn't reach Proposales. Your brief is saved.` |

## Filing

```mermaid
flowchart TD
  need["Fileable: email, both dates, attendees, language, and rooms when the end date is after the start"]
  en["English text and no stated language: store en"]
  yes["Yes, on Does this brief look right?"] --> yesHeld{Filing already stored?}
  yesHeld -->|yes| yesClear["No post. Notice cleared. Phase becomes favorites."]
  yesHeld -->|no| yesReady{Fileable?}
  yesReady -->|no, email missing| yesEmail["Notice: What email should receive the venue replies? No post."]
  yesReady -->|no, email set| yesClear
  yesReady -->|yes| yesCo["Selected company, else the first"]
  en --> need
  need --> yesReady
  word["file, or a line that contains file the brief"] --> stored{Filing already stored?}
  stored -->|yes| reuse["Return that filing. No Proposales call. Phase stays."]
  stored -->|no| wordGap{A fileable field is missing?}
  yesCo --> yesId{Company id?}
  yesId -->|no, filing open| yesSilent["No post. Notice stays empty."]
  yesId -->|no, filing closed| yesClosed["Filing is unavailable right now."]
  yesId -->|yes| yesPost[fileBrief]
  yesPost --> yesKind{Inbox token?}
  yesKind -->|yes| yesInbox["POST /v1/inbox/ and the token. No bearer. Notice stays empty. Detail shows The brief is filed."]
  yesKind -->|no| yesDraft["POST /v3/proposals. Bearer. Notice stays empty. Detail and thread show A draft was created in Proposales."]
  yesPost -->|throw| yesFail["Filing is unavailable right now. This post sets no draft sentence."]
  yesSilent --> yesDone[Phase becomes favorites]
  yesClosed --> yesDone
  yesInbox --> yesDone
  yesDraft --> yesDone
  yesFail --> yesDone
  yesEmail --> yesDone
  yesClear --> yesDone
  wordGap -->|yes| wordAsk["Notice asks questionForGap. No post."]
  wordGap -->|no| wordId{Company id?}
  wordId -->|no, filing open| wordWhich["Which company should receive the brief?"]
  wordId -->|no, filing closed| wordClosed["Filing is unavailable right now."]
  wordId -->|yes| wordPost[fileBrief]
  wordPost --> wordKind{Inbox token?}
  wordKind -->|yes| wordInbox["POST /v1/inbox/ and the token. No bearer. The brief is filed."]
  wordKind -->|no| wordDraft["POST /v3/proposals. Bearer. A draft was created in Proposales."]
  wordPost -->|throw| wordFail["Filing is unavailable right now. This post sets no draft sentence."]
  wordAsk --> wordPhase[Phase stays]
  wordWhich --> wordPhase
  wordClosed --> wordPhase
  wordInbox --> wordPhase
  wordDraft --> wordPhase
  wordFail --> wordPhase
  reuse --> wordPhase
```

`addEnglishLanguage` in `brief-language.ts` stores `en` when the text has two words from a small English list, no accented letters, and none of the Swedish, French, or German marker words. A language already on the brief, a language in the patch, `in swedish`, `på svenska`, or `Language` plus two letters other than `en` leaves the language as it is. The model path and the scripted path both do this.

With an email, the detail button sends `file`. With no email, it opens More, focuses Email, and does not call the server. The detail shows the latest filing message. A stored draft shows `A draft was created in Proposales.` A stored inbox filing shows `The brief is filed.` A successful Yes leaves the notice empty, and the detail still shows that sentence. The draft sentence also shows in the thread. The word `file` puts the inbox sentence on the notice. After a filing, including the filing Yes makes, the button reads Filed and is disabled.

`projectBriefFlow` sets the stage to `collecting`, `fileable`, `filed`, or `comparing`. Offers join that stage only after a filing result is stored. Ranked rows can still show while the stage is `collecting` or `fileable`.

An empty event name titles the draft with the city and the date. Each filed date joins its clock as a `Z` timestamp, and uses `00:00` when the clock is missing. The inbox body sets `is_test` to `1`. Draft data sets `planner_bench_brief` to true.

`/api/chat` files inside `runFixtureTurn`. That happens only when the user text says file, and the company id is `selectedCompanyId` alone. The `fileBrief` tool sends `file the brief`, and it may set the company id from the tool first. That chat path can post again. The page path returns the stored filing.

## Contract

```mermaid
flowchart LR
  spec["src/contract/openapi.json"] --> schemas["proposalesSchemas"]
  schemas --> tests["tests/contract.test.ts"]
  readers["Tolerant readers in http-client.ts"] --> http["createHttpClient"]
```

`proposalesSchemas()` reads that file, follows its refs with `@adaptate/utils`, and builds Zod schemas for Proposal, Company, CreateRfpRequest, CreateProposalRequest, ProposalMutationResponse, CreateRfpResponse, and ProposalSearchResult. `@adaptate/utils` is a devDependency. Only the contract test imports the loader.

The company schema rejects a null timezone and a loose website URL. The proposal schema rejects a loose email, a loose website, and null `is_agreement` and `pending`. The HTTP client tests parse a company and a proposal that carry those values. The readers keep the id, the name, the inbox token, and the unknown `data`.

## Checks

```mermaid
flowchart LR
  chat["chat:capture, chat:confirm, chat:favorites, chat:results"] --> e2e["pnpm e2e. Playwright Chromium. Fixture mode."]
  detail["detail:open or detail:closed"] --> e2e
  more["more:open or more:closed"] --> e2e
  facts["city, date, time, attendees, budget, budget-basis"] --> e2e
  chips["best-match, expired, no-food, over-budget, not-stated"] --> e2e
  e2e --> probe["e2e/run-probe.mjs"]
  probe --> plugin["layout-content-view, commit pinned in the README"]
```

The check job runs typecheck, test, lint, and build. The e2e job runs `pnpm e2e`, then the probe.
