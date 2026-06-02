import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu tối thiểu 8 ký tự')
  .max(128, 'Mật khẩu tối đa 128 ký tự')
  .regex(/[a-z]/, 'Mật khẩu cần có chữ thường')
  .regex(/[A-Z]/, 'Mật khẩu cần có chữ hoa')
  .regex(/[0-9]/, 'Mật khẩu cần có số')
  .regex(/[^A-Za-z0-9]/, 'Mật khẩu cần có ký tự đặc biệt');

const nameSchema = z
  .string()
  .min(1, 'Không được để trống')
  .max(100, 'Tối đa 100 ký tự')
  .regex(/\S/, 'Không được chỉ nhập khoảng trắng');

export const RegisterSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
});

export const LoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token không hợp lệ'),
  password: passwordSchema,
});

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
export type AuthTokens = z.infer<typeof AuthTokensSchema>;
