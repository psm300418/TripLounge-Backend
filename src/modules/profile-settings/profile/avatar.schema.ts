export const avatarMaxBytes = 5 * 1024 * 1024;
export const avatarBucket = "profile-avatars";
export type AvatarImage = { extension: "jpg" | "png" | "webp"; contentType: "image/jpeg" | "image/png" | "image/webp" };

function dimensions(width: number, height: number): void {
  if (width < 1 || height < 1 || width * height > 25000000) throw new Error("invalid dimensions");
}

// 파일명과 클라이언트 MIME을 신뢰하지 않는다. 이 검사는 픽셀 디코딩을 대신하지 않는다.
export function inspectAvatar(bytes: Buffer): AvatarImage {
  if (bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) {
    if (bytes.readUInt32BE(8) !== 13 || bytes.toString("ascii", 12, 16) !== "IHDR") throw new Error("invalid PNG header");
    dimensions(bytes.readUInt32BE(16), bytes.readUInt32BE(20));
    let imageData = false;
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const size = bytes.readUInt32BE(offset);
      const type = bytes.toString("ascii", offset + 4, offset + 8);
      const end = offset + 12 + size;
      if (end > bytes.length || type === "acTL") throw new Error("invalid PNG chunk");
      if (type === "IDAT" && size > 0) imageData = true;
      if (type === "IEND") {
        if (size !== 0 || end !== bytes.length || !imageData) throw new Error("invalid PNG end");
        return { extension: "png", contentType: "image/png" };
      }
      offset = end;
    }
    throw new Error("truncated PNG");
  }
  if (bytes.length >= 12 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    if (bytes.readUInt16BE(bytes.length - 2) !== 0xffd9) throw new Error("truncated JPEG");
    let hasFrame = false;
    for (let offset = 2; offset + 4 <= bytes.length;) {
      if (bytes[offset++] !== 0xff) throw new Error("invalid JPEG marker");
      while (offset < bytes.length && bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (offset + 2 > bytes.length) break;
      const size = bytes.readUInt16BE(offset);
      if (size < 2 || offset + size > bytes.length - 2) throw new Error("invalid JPEG segment");
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        if (size < 8) throw new Error("invalid JPEG frame");
        dimensions(bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3));
        hasFrame = true;
      }
      if (marker === 0xda) {
        if (!hasFrame || size < 6 || offset + size >= bytes.length - 2) throw new Error("invalid JPEG scan");
        return { extension: "jpg", contentType: "image/jpeg" };
      }
      offset += size;
    }
    throw new Error("missing JPEG scan");
  }
  if (bytes.length >= 20 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    if (bytes.readUInt32LE(4) + 8 !== bytes.length) throw new Error("invalid WebP size");
    let frames = 0;
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const type = bytes.toString("ascii", offset, offset + 4);
      const size = bytes.readUInt32LE(offset + 4);
      const start = offset + 8;
      const end = start + size + (size % 2);
      if (end > bytes.length || type === "ANIM" || type === "ANMF") throw new Error("invalid WebP chunk");
      if (type === "VP8X") {
        if (size !== 10 || (bytes[start] & 2)) throw new Error("animated WebP");
        dimensions(bytes.readUIntLE(start + 4, 3) + 1, bytes.readUIntLE(start + 7, 3) + 1);
      } else if (type === "VP8 ") {
        if (size < 10 || (bytes[start] & 1) || bytes.readUIntLE(start + 3, 3) !== 0x2a019d) throw new Error("invalid WebP frame");
        dimensions(bytes.readUInt16LE(start + 6) & 0x3fff, bytes.readUInt16LE(start + 8) & 0x3fff);
        frames++;
      } else if (type === "VP8L") {
        if (size < 5 || bytes[start] !== 0x2f) throw new Error("invalid lossless WebP");
        const bits = bytes.readUInt32LE(start + 1);
        if (bits >>> 29) throw new Error("unsupported WebP version");
        dimensions((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
        frames++;
      }
      offset = end;
    }
    if (offset !== bytes.length || frames !== 1) throw new Error("invalid WebP frame count");
    return { extension: "webp", contentType: "image/webp" };
  }
  throw new Error("unsupported image");
}
