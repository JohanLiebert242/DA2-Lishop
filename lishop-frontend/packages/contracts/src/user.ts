import { z } from 'zod';
import { UserRole } from './common';

export const AddressSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  phone: z.string(),
  street: z.string(),
  district: z.string(),
  city: z.string(),
  country: z.string().default('VN'),
  isDefault: z.boolean().default(false),
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  avatarUrl: z.string().url().nullable(),
  role: z.nativeEnum(UserRole),
  loyaltyPoints: z.number().int().default(0),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
});

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

export type Address = z.infer<typeof AddressSchema>;
export type User = z.infer<typeof UserSchema>;
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
