// Only the setup command uses provider secrets and the Management API token.
export function readAuthConfig(values) {
  const required = name => {
    const value = values[name]?.trim();
    if (!value || /^(your-|replace-|<)/i.test(value)) throw new Error(`${name} 값을 .env에 입력하세요.`);
    return value;
  };
  const supabaseUrl = new URL(required('SUPABASE_URL'));
  const match = /^([a-z0-9]{20})\.supabase\.co$/.exec(supabaseUrl.hostname);
  if (!match || supabaseUrl.protocol !== 'https:' || supabaseUrl.port || supabaseUrl.username || supabaseUrl.password || supabaseUrl.search || supabaseUrl.hash || supabaseUrl.pathname !== '/') {
    throw new Error('SUPABASE_URL은 https://프로젝트참조ID.supabase.co 형식이어야 합니다. 사용자 지정 도메인은 Dashboard에서 수동 설정하세요.');
  }
  required('SUPABASE_ANON_KEY');
  if (!/^[a-f0-9]{64}$/i.test(required('AUTH_COOKIE_SECRET'))) throw new Error('AUTH_COOKIE_SECRET은 64자리 hex여야 합니다.');
  const client = new URL(required('CLIENT_ORIGIN'));
  const redirect = new URL(required('AUTH_REDIRECT_URL'));
  for (const url of [client, redirect]) {
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.hash || url.search || url.href.includes(',')) {
      throw new Error('CLIENT_ORIGIN과 AUTH_REDIRECT_URL에는 HTTP(S) 주소만 사용하세요. 쿼리·fragment·쉼표는 사용할 수 없습니다.');
    }
    if (url.protocol !== 'https:' && (values.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
      throw new Error('로컬 개발 이외에는 HTTPS 주소를 사용하세요.');
    }
  }
  if (client.pathname !== '/' || redirect.origin !== client.origin) throw new Error('CLIENT_ORIGIN은 프런트 원점이어야 하며 AUTH_REDIRECT_URL과 원점이 같아야 합니다.');
  const patch = {};
  const providers = [];
  for (const [provider, idName, secretName] of [
    ['google', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    ['kakao', 'KAKAO_REST_API_KEY', 'KAKAO_CLIENT_SECRET'],
  ]) {
    if (!values[idName]?.trim() && !values[secretName]?.trim()) continue;
    const id = required(idName);
    const secret = required(secretName);
    if (provider === 'google' && !id.endsWith('.apps.googleusercontent.com')) throw new Error('GOOGLE_CLIENT_ID에는 Google 웹 애플리케이션 OAuth 클라이언트 ID를 입력하세요. 일반 API 키는 사용할 수 없습니다.');
    patch[`external_${provider}_enabled`] = true;
    patch[`external_${provider}_client_id`] = id;
    patch[`external_${provider}_secret`] = secret;
    providers.push(provider);
  }
  if (!providers.length) throw new Error('Google 또는 Kakao의 ID와 Client Secret을 입력하세요.');
  if (providers.includes('kakao')) {
    // Kakao login never requests account_email in this project.
    patch.external_kakao_email_optional = true;
  }
  return { projectRef: match[1], callbackUrl: `${supabaseUrl.origin}/auth/v1/callback`, redirectUrl: redirect.href, providers, patch };
}

export async function applyAuthConfig(config, token, request = fetch) {
  if (!token?.trim() || /^(your-|replace-|<)/i.test(token.trim())) throw new Error('SUPABASE_ACCESS_TOKEN을 입력하세요. anon/service_role 키가 아닌 계정의 Personal Access Token입니다.');
  const endpoint = `https://api.supabase.com/v1/projects/${config.projectRef}/config/auth`;
  const headers = { Authorization: `Bearer ${token.trim()}`, 'Content-Type': 'application/json' };
  const call = async options => {
    let response;
    try { response = await request(endpoint, { ...options, headers, redirect: 'error', signal: AbortSignal.timeout(15000) }); }
    catch { throw new Error('Supabase 설정 요청에 실패했습니다. 네트워크를 확인한 뒤 다시 실행하세요.'); }
    // Response bodies may contain provider secrets; never print them.
    if (!response.ok) throw new Error(`Supabase 설정 요청 실패 (HTTP ${response.status}). 프로젝트 참조 ID와 토큰의 Auth 설정 읽기/쓰기 권한을 확인하세요.`);
    return response;
  };
  const current = await (await call({ method: 'GET' })).json();
  if (!current || typeof current !== 'object' || typeof current.uri_allow_list !== 'string') throw new Error('기존 리디렉션 설정을 읽지 못했습니다. 설정을 변경하지 않았습니다.');
  const redirects = new Set(current.uri_allow_list.split(',').map(url => url.trim()).filter(Boolean));
  redirects.add(config.redirectUrl);
  await call({ method: 'PATCH', body: JSON.stringify({ ...config.patch, uri_allow_list: [...redirects].join(',') }) });
}
