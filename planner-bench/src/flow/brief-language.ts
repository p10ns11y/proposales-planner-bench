import type { PlannerBrief } from "../domain/planner-brief";

const englishWords = new Set([
  "the",
  "and",
  "with",
  "from",
  "people",
  "need",
  "needs",
  "meeting",
  "place",
  "places",
  "for",
  "day",
  "offsite",
  "attendees",
  "budget",
  "dinner",
  "lunch",
  "breakfast",
  "room",
  "rooms",
  "full",
]);

const otherLanguageWords = new Set([
  "och",
  "att",
  "jag",
  "inte",
  "det",
  "som",
  "ett",
  "med",
  "till",
  "personer",
  "behover",
  "plats",
  "ska",
  "vill",
  "lokal",
  "dagar",
  "une",
  "pour",
  "avec",
  "les",
  "des",
  "dans",
  "bonjour",
  "cherche",
  "personnes",
  "und",
  "ich",
  "nicht",
  "eine",
  "einen",
  "personen",
]);

function textWords(text: string): Set<string> {
  const matched = text.toLowerCase().match(/[a-z]+/g);
  const words = new Set<string>();
  if (matched === null) {
    return words;
  }
  for (const word of matched) {
    words.add(word);
  }
  return words;
}

export function briefWrittenInEnglish(text: string): boolean {
  if (/[À-ÖØ-öø-ÿ]/.test(text)) {
    return false;
  }
  const words = textWords(text);
  for (const word of otherLanguageWords) {
    if (words.has(word)) {
      return false;
    }
  }
  let found = 0;
  for (const word of englishWords) {
    if (words.has(word)) {
      found += 1;
    }
  }
  return found >= 2;
}

export function addEnglishLanguage(text: string, prior: PlannerBrief, extracted: PlannerBrief): PlannerBrief {
  if (hasLanguage(prior) || hasLanguage(extracted) || statesOtherLanguage(text) || !briefWrittenInEnglish(text)) {
    return extracted;
  }
  return { ...extracted, language: "en" };
}

function hasLanguage(brief: PlannerBrief): boolean {
  return brief.language !== undefined && brief.language.trim() !== "";
}

export function statesOtherLanguage(text: string): boolean {
  if (/\b(?:in\s+swedish|på\s+svenska)\b/i.test(text)) {
    return true;
  }
  const labeled = /\blanguage\s+([a-z]{2})\b/i.exec(text);
  return labeled?.[1] !== undefined && labeled[1].toLowerCase() !== "en";
}
