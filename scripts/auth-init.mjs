import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const template = await readFile(new URL('.env.example', root), 'utf8');
try {
  await writeFile(new URL('.env', root), template.replace('replace-with-64-hex-characters', randomBytes(32).toString('hex')), { flag: 'wx', mode: 0o600 });
  console.log('.env 생성 완료. 쿠키 암호화 키는 자동 생성했습니다. Supabase 및 Google/Kakao 키를 입력하세요.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('기존 .env를 보존했습니다. 새 설정 항목은 .env.example을 참고해 추가하세요.');
}
