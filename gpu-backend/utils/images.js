function validImage(value) {
  if (typeof value !== "string") return false;
  if (value.startsWith("https://") && value.length <= 2048) {
    try { const url = new URL(value); return !!url.hostname && !url.username && !url.password; } catch { return false; }
  }
  const match = value.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length % 4 || match[2].length > 1398104) return false;
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > 1024 * 1024) return false;
  if (match[1] === "jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (match[1] === "png") return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
}
module.exports = { validImage };
