export function isLikelyGoogleDriveId(value: string): boolean {
  return /^[A-Za-z0-9_-]{20,}$/.test(value)
}
