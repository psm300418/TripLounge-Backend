import { supabase } from '../../config/supabase';
import { AppError } from '../../utils/appError';

export interface UserRow {
  id: string;
  email: string;
  nickname: string;
  created_at: string;
}

interface CreateUserParams {
  email: string;
  passwordHash: string;
  nickname: string;
}

const USER_COLUMNS = 'id, email, nickname, created_at';
const UNIQUE_VIOLATION_CODE = '23505';

export const authRepository = {
  async findUserByEmail(email: string): Promise<UserRow | null> {
    const { data, error } = await supabase
      .from('users')
      .select(USER_COLUMNS)
      .eq('email', email)
      .maybeSingle();

    if (error) {
      throw new AppError(500, 'INTERNAL_SERVER_ERROR', '사용자 조회 중 오류가 발생했습니다.');
    }
    return data as UserRow | null;
  },

  async findUserByNickname(nickname: string): Promise<UserRow | null> {
    const { data, error } = await supabase
      .from('users')
      .select(USER_COLUMNS)
      .eq('nickname', nickname)
      .maybeSingle();

    if (error) {
      throw new AppError(500, 'INTERNAL_SERVER_ERROR', '사용자 조회 중 오류가 발생했습니다.');
    }
    return data as UserRow | null;
  },

  async createUser({ email, passwordHash, nickname }: CreateUserParams): Promise<UserRow> {
    const { data, error } = await supabase
      .from('users')
      .insert({ email, password_hash: passwordHash, nickname })
      .select(USER_COLUMNS)
      .single();

    if (error) {
      // 동시 가입 요청으로 사전 중복 검사를 통과한 경우 DB UNIQUE 제약으로 방어
      if (error.code === UNIQUE_VIOLATION_CODE) {
        if (error.message.includes('nickname')) {
          throw new AppError(409, 'ALREADY_NICKNAME', '이미 사용 중인 닉네임입니다.');
        }
        throw new AppError(409, 'ALREADY_EMAIL', '이미 가입된 이메일입니다.');
      }
      throw new AppError(500, 'INTERNAL_SERVER_ERROR', '회원 생성 중 오류가 발생했습니다.');
    }
    return data as UserRow;
  },
};
