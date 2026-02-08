/**
 * Seed script — generates data/db.json with demo data.
 * Run: node scripts/seed.mjs
 */

import { randomUUID } from "crypto";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", "data", "db.json");

const uid = () => randomUUID();
const shortToken = () => randomUUID().slice(0, 12);

// ─── Timestamps ──────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ─── IDs ─────────────────────────────────────────────────────────────
const teamId = uid();
const qSetId = uid();

// Fixed questions
const q1Id = uid(); // Workload
const q2Id = uid(); // Focus time
const q3Id = uid(); // Clarity
const q4Id = uid(); // Purpose

// Rotating pool questions
const q5Id = uid();  // Safety
const q6Id = uid();  // Decisions
const q7Id = uid();  // Who to ask
const q8Id = uid();  // Meetings
const q9Id = uid();  // Feedback
const q10Id = uid(); // Energy

const fixedQIds = [q1Id, q2Id, q3Id, q4Id];
const rotatingQIds = [q5Id, q6Id, q7Id, q8Id, q9Id, q10Id];

// ─── 11 rounds: 10 closed + 1 open ─────────────────────────────────
const NUM_CLOSED = 10;
const roundIds = [];
const roundTokens = [];
for (let i = 0; i <= NUM_CLOSED; i++) {
  roundIds.push(uid());
  roundTokens.push(i === NUM_CLOSED ? "demo-round-open" : shortToken());
}

// Round questions — fixed questions in every round, rotating cycles through pool
const allRoundQuestions = [];
const rqByRound = {};

for (let ri = 0; ri <= NUM_CLOSED; ri++) {
  const roundId = roundIds[ri];
  rqByRound[roundId] = [];

  fixedQIds.forEach((qId, i) => {
    const rqItem = { id: uid(), round_id: roundId, question_id: qId, kind: "fixed", position: i + 1 };
    allRoundQuestions.push(rqItem);
    rqByRound[roundId].push(rqItem);
  });

  // Rotating: cycle through pool
  const rotQ = rotatingQIds[ri % rotatingQIds.length];
  const rqItem = { id: uid(), round_id: roundId, question_id: rotQ, kind: "rotating", position: 5 };
  allRoundQuestions.push(rqItem);
  rqByRound[roundId].push(rqItem);
}

// ─── Value generation with realistic trends ─────────────────────────
// Base averages for each fixed question, drifting over rounds
// Scale is 1-3
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function pickVal(avg) {
  // Probabilistically pick 1, 2, or 3 based on target avg
  const r = Math.random();
  if (avg <= 1.5) return r < 0.6 ? 1 : r < 0.9 ? 2 : 3;
  if (avg >= 2.5) return r < 0.6 ? 3 : r < 0.9 ? 2 : 1;
  return r < 0.15 ? 1 : r < 0.85 ? 2 : 3;
}

// Trends per fixed question across 11 rounds (index 0..10)
// workload: starts okay, dips mid, recovers
const workloadTrend =  [2.0, 2.1, 1.8, 1.6, 1.5, 1.7, 1.9, 2.2, 2.4, 2.3, 2.5];
// focus: slowly improving
const focusTrend =     [1.8, 1.9, 2.0, 2.0, 2.1, 2.2, 2.3, 2.4, 2.3, 2.5, 2.6];
// clarity: drops hard mid, then recovers
const clarityTrend =   [2.5, 2.3, 2.0, 1.6, 1.4, 1.5, 1.8, 2.0, 2.2, 2.4, 2.5];
// purpose: consistently good
const purposeTrend =   [2.6, 2.7, 2.5, 2.4, 2.6, 2.7, 2.8, 2.7, 2.6, 2.8, 2.9];

const trendMap = {
  [q1Id]: workloadTrend,
  [q2Id]: focusTrend,
  [q3Id]: clarityTrend,
  [q4Id]: purposeTrend,
};

// Rotating questions get moderate averages with some spread
const rotatingAvg = 2.0;

function makeSubmissions(roundId, roundRqs, count, roundIdx) {
  const subs = [];
  const answers = [];

  for (let i = 0; i < count; i++) {
    const subId = uid();
    subs.push({
      id: subId,
      round_id: roundId,
      client_hash: null,
      created_at: daysAgo(NUM_CLOSED * 14 - roundIdx * 14 + Math.floor(Math.random() * 3)),
    });

    for (const rqItem of roundRqs) {
      const trend = trendMap[rqItem.question_id];
      const targetAvg = trend ? trend[roundIdx] : rotatingAvg + (Math.random() - 0.5) * 0.6;
      answers.push({
        id: uid(),
        submission_id: subId,
        round_question_id: rqItem.id,
        value: clamp(pickVal(targetAvg), 1, 3),
      });
    }
  }
  return { subs, answers };
}

// Generate submissions for each closed round (4-7 respondents each)
const allSubs = [];
const allAnswers = [];
const allFreeTexts = [];

for (let ri = 0; ri < NUM_CLOSED; ri++) {
  const count = 4 + Math.floor(Math.random() * 4); // 4-7
  const { subs, answers } = makeSubmissions(roundIds[ri], rqByRound[roundIds[ri]], count, ri);
  allSubs.push(...subs);
  allAnswers.push(...answers);
}

// Free texts scattered across a few rounds
const freeTextSamples = [
  "Would be great to know the roadmap better.",
  "Feels like we're spinning plates sometimes. Not bad, just... a lot.",
  "The new sprint format is actually working really well for me.",
  "I wish we had more cross-team visibility.",
  "Shoutout to the team for pulling together last week!",
  "Not sure who owns the deployment pipeline right now.",
  "Less meetings = more focus. Can we keep this up?",
  "Feeling a bit disconnected from the bigger picture lately.",
];

// Add free texts to rounds 2, 4, 6, 8, 9 (a few per round)
[2, 4, 6, 8, 9].forEach((ri, idx) => {
  const roundSubs = allSubs.filter(s => s.round_id === roundIds[ri]);
  if (roundSubs.length > 0) {
    allFreeTexts.push({
      id: uid(),
      submission_id: roundSubs[0].id,
      text: freeTextSamples[idx * 2 % freeTextSamples.length],
      created_at: roundSubs[0].created_at,
    });
    if (roundSubs.length > 1) {
      allFreeTexts.push({
        id: uid(),
        submission_id: roundSubs[1].id,
        text: freeTextSamples[(idx * 2 + 1) % freeTextSamples.length],
        created_at: roundSubs[1].created_at,
      });
    }
  }
});

// ─── Build DB ────────────────────────────────────────────────────────
const rounds = [];
for (let ri = 0; ri < NUM_CLOSED; ri++) {
  const ago = NUM_CLOSED * 14 - ri * 14;
  rounds.push({
    id: roundIds[ri],
    team_id: teamId,
    question_set_id: qSetId,
    token: roundTokens[ri],
    status: "closed",
    opens_at: daysAgo(ago),
    closes_at: daysAgo(ago - 2),
    created_at: daysAgo(ago),
  });
}
// Open round
rounds.push({
  id: roundIds[NUM_CLOSED],
  team_id: teamId,
  question_set_id: qSetId,
  token: roundTokens[NUM_CLOSED],
  status: "open",
  opens_at: daysAgo(1),
  closes_at: null,
  created_at: daysAgo(1),
});

const db = {
  teams: [
    {
      id: teamId,
      name: "Texty Beasts",
      slug: "tx",
      admin_token: "demo-admin-token-abc123",
      created_at: daysAgo(200),
    },
  ],
  team_settings: [
    {
      team_id: teamId,
      cadence: "biweekly",
      scale_max: 3,
      min_responses_to_show: 4,
      allow_free_text: true,
    },
  ],
  question_bank: [
    { id: q1Id, team_id: teamId, text: "Workload feels sustainable.", category: "workload", is_active: true, created_at: daysAgo(200) },
    { id: q2Id, team_id: teamId, text: "I get enough focus time to do good work.", category: "focus", is_active: true, created_at: daysAgo(200) },
    { id: q3Id, team_id: teamId, text: "It's clear what matters most right now.", category: "clarity", is_active: true, created_at: daysAgo(200) },
    { id: q4Id, team_id: teamId, text: "I understand why we're doing what we're doing.", category: "purpose", is_active: true, created_at: daysAgo(200) },
    { id: q5Id, team_id: teamId, text: "I feel comfortable raising concerns in this team.", category: "safety", is_active: true, created_at: daysAgo(199) },
    { id: q6Id, team_id: teamId, text: "Decisions are made at a reasonable pace.", category: "pace", is_active: true, created_at: daysAgo(198) },
    { id: q7Id, team_id: teamId, text: "I know who to ask when I'm stuck.", category: "collaboration", is_active: true, created_at: daysAgo(197) },
    { id: q8Id, team_id: teamId, text: "Meetings feel worthwhile.", category: "meetings", is_active: true, created_at: daysAgo(196) },
    { id: q9Id, team_id: teamId, text: "I get useful feedback on my work.", category: "feedback", is_active: true, created_at: daysAgo(195) },
    { id: q10Id, team_id: teamId, text: "I have enough energy at the end of the week.", category: "energy", is_active: true, created_at: daysAgo(194) },
  ],
  question_set: [
    { id: qSetId, team_id: teamId, is_default: true },
  ],
  question_set_item: [
    { id: uid(), question_set_id: qSetId, question_id: q1Id, position: 1, kind: "fixed" },
    { id: uid(), question_set_id: qSetId, question_id: q2Id, position: 2, kind: "fixed" },
    { id: uid(), question_set_id: qSetId, question_id: q3Id, position: 3, kind: "fixed" },
    { id: uid(), question_set_id: qSetId, question_id: q4Id, position: 4, kind: "fixed" },
    { id: uid(), question_set_id: qSetId, question_id: q5Id, position: 5, kind: "rotating_pool" },
    { id: uid(), question_set_id: qSetId, question_id: q6Id, position: 6, kind: "rotating_pool" },
    { id: uid(), question_set_id: qSetId, question_id: q7Id, position: 7, kind: "rotating_pool" },
    { id: uid(), question_set_id: qSetId, question_id: q8Id, position: 8, kind: "rotating_pool" },
    { id: uid(), question_set_id: qSetId, question_id: q9Id, position: 9, kind: "rotating_pool" },
    { id: uid(), question_set_id: qSetId, question_id: q10Id, position: 10, kind: "rotating_pool" },
  ],
  rounds,
  round_questions: allRoundQuestions,
  submissions: allSubs,
  answers: allAnswers,
  free_text: allFreeTexts,
};

// ─── Write ───────────────────────────────────────────────────────────
mkdirSync(join(__dirname, "..", "data"), { recursive: true });
writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");

console.log("Seeded data/db.json");
console.log(`  Team: ${db.teams[0].name} (slug: ${db.teams[0].slug})`);
console.log(`  Admin link: /admin/${db.teams[0].admin_token}`);
console.log(`  Open round respond link: /r/${roundTokens[NUM_CLOSED]}`);
console.log(`  Dashboard: /t/tx`);
console.log(`  ${db.rounds.length} rounds (${db.rounds.filter(r => r.status === "closed").length} closed, ${db.rounds.filter(r => r.status === "open").length} open)`);
console.log(`  ${db.submissions.length} submissions with ${db.answers.length} answers`);
console.log(`  ${db.free_text.length} free text entries`);
