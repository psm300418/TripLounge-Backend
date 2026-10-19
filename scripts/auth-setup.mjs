import { readFile } from 'node:fs/promises';
import { parse } from 'dotenv';
import { readAuthConfig, applyAuthConfig } from './auth-config.mjs';

try {
  if (process.argv.slice(2).some(arg => arg !== '--check')) throw new Error('사용법: npm run auth:setup 또는 npm run auth:check');
  let file = {};
  try { file = parse(await readFile(new URL('../.env', import.meta.url))); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const values = { ...file, ...process.env };
  const config = readAuthConfig(values);
  console.log(`대상 프로젝트: ${config.projectRef}, 제공자: ${config.providers.join(', ')}`);
  console.log(`Google/Kakao 콘솔에 등록할 Redirect URI: ${config.callbackUrl}`);
  console.log(`로그인 완료 후 돌아올 주소: ${config.redirectUrl}`);
  if (process.argv.includes('--check')) {
    console.log('로컬 설정 형식 확인 완료. 네트워크 호출 및 실제 키 유효성 검증은 수행하지 않았습니다.');
  } else {
    await applyAuthConfig(config, values.SUPABASE_ACCESS_TOKEN);
    console.log('Supabase 제공자/리디렉션 설정 완료. 개발자 콘솔 Redirect URI와 DB SQL 적용도 확인하세요.');
    console.log('SUPABASE_ACCESS_TOKEN 및 제공자 키는 서버 실행에 필요하지 않으며 .env에서 제거해도 됩니다.');
  }
} catch (error) {
  console.error(error instanceof Error && error.name === 'Error' ? error.message : '설정 파일 형식을 확인하세요. 비밀 값은 출력하지 않습니다.');
  process.exitCode = 1;
}
