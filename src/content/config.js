import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    summary: z.string().optional(),
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional(),
  }),
});

// Drop a file here named after an episode slug to publish its transcript.
const transcripts = defineCollection({
  type: 'content',
  schema: z.object({ episode: z.string() }),
});

export const collections = { blog, transcripts };
