import bcrypt from 'bcrypt';
import { AppError } from '../../utils/appError';
import { authRepository, UserRow } from './auth.repository';
import { SignUpInput } from './auth.schema';

const SALT_ROUNDS = 10;

export interface SignUpResult {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
}

const toSignUpResult = (user: UserRow): SignUpResult => ({
  id: user.id,
  email: user.email,
  nickname: user.nickname,
  createdAt: user.created_at,
});

export const authService = {
  async signUp({ email, password, nickname }: SignUpInput): Promise<SignUpResult> {
    const existingEmailUser = await authRepository.findUserByEmail(email);
    if (existingEmailUser) {
      throw new AppError(409, 'ALREADY_EMAIL', '이미 가입된 이메일입니다.');
    }

    const existingNicknameUser = await authRepository.findUserByNickname(nickname);
    if (existingNicknameUser) {
      throw new AppError(409, 'ALREADY_NICKNAME', '이미 사용 중인 닉네임입니다.');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await authRepository.createUser({ email, passwordHash, nickname });

    return toSignUpResult(user);
  },
};
