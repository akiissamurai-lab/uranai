import { z } from "zod";

export const dailyOutputSchema = z.object({
  message: z.string(),
  one_line: z.string(),
  action: z.string(),
  lucky_color: z.string(),
  lucky_item: z.string(),
});

export type DailyOutput = z.infer<typeof dailyOutputSchema>;
