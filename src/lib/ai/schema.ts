import { z } from "zod";

export const fortuneSectionSchema = z.object({
  key: z.enum(["love", "work", "money", "health", "general"]),
  headline: z.string(),
  score: z.number().int().min(1).max(5),
  text: z.string(),
  do: z.array(z.string()),
  avoid: z.array(z.string()),
});

export const fortuneOutputSchema = z.object({
  intro: z.string(),
  summary: z.object({
    title: z.string(),
    overall_score: z.number().int().min(1).max(100),
    one_line: z.string(),
    week_one_line: z.string(),
  }),
  sections: z.array(fortuneSectionSchema).length(5),
  today_action: z.object({
    action: z.string(),
    why: z.string(),
  }),
  lucky: z.object({
    color: z.string(),
    item: z.string(),
    place: z.string(),
    time: z.string(),
  }),
  disclaimer: z.string(),
});

export type FortuneOutput = z.infer<typeof fortuneOutputSchema>;
export type FortuneSection = z.infer<typeof fortuneSectionSchema>;
