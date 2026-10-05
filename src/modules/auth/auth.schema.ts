import { z } from 'zod';

export const signUpSchema = z.object({
  email: z
    .string({ required_error: '이메일은 필수입니다.' })
    .trim()
    .toLowerCase()
    .email('올바른 이메일 형식이 아닙니다.')
    .max(100, '이메일은 100자 이하여야 합니다.'),
  password: z
    .string({ required_error: '비밀번호는 필수입니다.' })
    .min(8, '비밀번호는 8자 이상이어야 합니다.')
    .max(64, '비밀번호는 64자 이하여야 합니다.')
    .regex(/[A-Za-z]/, '비밀번호에 영문자가 포함되어야 합니다.')
    .regex(/[0-9]/, '비밀번호에 숫자가 포함되어야 합니다.'),
  nickname: z
    .string({ required_error: '닉네임은 필수입니다.' })
    .trim()
    .min(2, '닉네임은 2자 이상이어야 합니다.')
    .max(20, '닉네임은 20자 이하여야 합니다.'),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
