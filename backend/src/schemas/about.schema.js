
import { z } from "zod";

const text = (max) =>
  z.string().trim().min(1).max(max);

const sectionSchema = z.object({
  title: text(150),
  description: text(10000),
}).strict();

const introductionSchema = z.object({
  eyebrow: text(100),
  title: text(150),
  description: text(15000),
}).strict();

export const saveAboutSchema = z.object({
  hero: sectionSchema,
  introduction: introductionSchema,
  vision: sectionSchema,
  mission: sectionSchema,
}).strict();
