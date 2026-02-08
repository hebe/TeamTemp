/**
 * Retro check-in questions — icebreaker warm-ups shown at the top of
 * each retro page. One is deterministically picked per round so the
 * same retro always shows the same question.
 *
 * These are read aloud at the start of a retro meeting. They're not
 * answered digitally — just conversation starters.
 */

export const CHECK_IN_QUESTIONS = [
  // Metaphor / imagination
  "If your week was a weather forecast, what would it say?",
  "What animal best describes your energy level right now?",
  "If you could teleport anywhere for lunch today, where would you go?",
  "What emoji sums up your week so far?",
  "If your current mood were a song genre, what would it be?",
  "Which of the Simpsons do you feel like today?",
  "If your workload was a dish, what would it be?",
  "What colour best represents your state of mind right now?",

  // Reflective but light
  "What's one small thing from this week you'd call a win?",
  "When was the last time something at work made you smile?",
  "What's something you learned recently that surprised you?",
  "What's one thing you're looking forward to this week?",
  "What helps you get into the flow?",
  "What's a part of your job you particularly enjoy?",
  "What's a piece of advice or feedback you've heard more than once?",
  "What's something you get to do at work that you really love?",

  // Fun / random
  "What's the last thing you watched or read that you'd recommend?",
  "If you had an extra hour today, how would you spend it?",
  "What's your current comfort food?",
  "Describe your week in exactly three words.",
  "What's the most interesting conversation you've had recently?",
  "What superpower would make your workday easier?",
  "What's something outside of work that's been on your mind lately?",
  "If your team was a band, what would your role be?",
  "What do you need today to help you focus?",

  // Metaphor / imagination (batch 2)
  "If your week was a movie, what genre would it be?",
  "What fictional character do you relate to most right now?",
  "If you could swap jobs with anyone for a day, who would it be?",
  "What vehicle best describes your pace this week?",
  "If your mood was a season, which one would it be?",
  "What TV show title sums up your week?",
  "What would the title of your autobiography chapter this week be?",

  // Reflective but light (batch 2)
  "What's a skill you've picked up that you didn't expect to need?",
  "What's something a colleague did recently that you appreciated?",
  "When was the last time you felt really in the zone?",
  "What's one thing you'd want more of at work?",
  "What's the best mistake you've made — one that taught you something good?",
  "What's a small habit that makes your workday better?",
  "If you could go back to the start of the week, what would you do differently?",
  "What's something you're proud of that nobody noticed?",
  "What's the kindest thing someone has done for you at work?",

  // Fun / random (batch 2)
  "What's a place you've been that you'd love to go back to?",
  "If you could learn any skill instantly, what would it be?",
  "What's the last thing that made you laugh out loud?",
  "What's your go-to way to recharge after a long day?",
  "If you could have dinner with anyone, living or dead, who would it be?",
  "What's a song that's been stuck in your head lately?",
  "What's the most random fact you know?",
  "What's something you're terrible at but love doing anyway?",
] as const;

/**
 * Deterministically pick a check-in question for a given round.
 * Uses a simple DJB2-style string hash of the round ID to select
 * an index. Same round ID always returns the same question.
 */
export function getCheckInQuestion(roundId: string): string {
  let hash = 0;
  for (let i = 0; i < roundId.length; i++) {
    const char = roundId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % CHECK_IN_QUESTIONS.length;
  return CHECK_IN_QUESTIONS[index];
}
