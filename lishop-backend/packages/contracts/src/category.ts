import { z } from 'zod';

export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  imageUrl: z.string().url().nullable(),
  parentId: z.string().uuid().nullable(),
  children: z.lazy((): z.ZodTypeAny => z.array(CategorySchema)).optional(),
});

export type Category = z.infer<typeof CategorySchema>;
