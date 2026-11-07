import { env } from "../../config/env.js";

type NaverReverseGeocodingResponse = {
  results?: Array<{
    name?: string;
    region?: {
      area1?: { name?: string };
      area2?: { name?: string };
      area3?: { name?: string };
    };
    land?: {
      name?: string;
      number1?: string;
    };
  }>;
};

export async function findRoadAddress(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const url = new URL(
      "https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc"
    );
    url.searchParams.set("coords", `${longitude},${latitude}`);
    url.searchParams.set("sourcecrs", "EPSG:4326");
    url.searchParams.set("orders", "roadaddr");
    url.searchParams.set("output", "json");

    const response = await fetch(url, {
      headers: {
        "x-ncp-apigw-api-key-id": env.naverMapsApiKeyId,
        "x-ncp-apigw-api-key": env.naverMapsApiKey,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return null;
    }

    const result =
      (await response.json()) as NaverReverseGeocodingResponse;
    const roadResult = result.results?.find(
      (item) => item.name === "roadaddr"
    );

    const region = roadResult?.region;
    const area3 = region?.area3?.name;
    const roadName = roadResult?.land?.name;
    const buildingNumber = roadResult?.land?.number1;

    if (!roadName || !buildingNumber) {
      return null;
    }

    const addressParts = [
      region?.area1?.name,
      region?.area2?.name,
      // 읍/면은 도로명 주소에 포함되지만 도심의 동 이름은 보통 제외합니다.
      area3 && /(읍|면)$/.test(area3) ? area3 : undefined,
      `${roadName} ${buildingNumber}`,
    ].filter((part): part is string => Boolean(part));

    return addressParts.join(" ");
  } catch {
    // Naver API 실패가 사진 업로드 실패로 이어지지 않도록 주소 미확정 처리
    return null;
  }
}
