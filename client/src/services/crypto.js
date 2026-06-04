/**
 * Custom self-contained cryptographic signing and geo-distance verification services.
 * Implements lightweight time-decay validation and coordinate distance formulas.
 */

// Simple time-decay signature generator
const SECRET_SALT = 'ABES_GO_ERP_SECURE_TOKEN_SALT_2026';

/**
 * Basic DJB2 and Murmur-like hash combination for a lightweight, secure signature
 * of geofence state without external dependencies.
 */
export function generateTokenSignature(timestamp, courseId, roomX, roomY) {
  // Round timestamp to the nearest 15-second window to prevent screenshot sharing
  const timeWindow = Math.floor(Number(timestamp) / 15000);
  const inputStr = `${timeWindow}:${courseId}:${roomX}:${roomY}:${SECRET_SALT}`;
  
  let hash1 = 5381;
  let hash2 = 33;
  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) + char; /* hash * 33 + c */
    hash2 = hash2 * 33 ^ char;
  }
  
  return `${(hash1 >>> 0).toString(16)}-${(hash2 >>> 0).toString(16)}`;
}

/**
 * Validates a signature against a timestamp window.
 * Supports a ±1 window margin to account for network latency (30-second total leeway).
 */
export function verifyTokenSignature(token, timestamp, courseId, roomX, roomY) {
  const current = Date.now();
  const tokenTime = Number(timestamp);
  
  // Expiry check: Token must be generated within the last 30 seconds
  if (Math.abs(current - tokenTime) > 30000) {
    return { valid: false, reason: 'TOKEN_EXPIRED' };
  }
  
  // Re-generate signature for current time window and last time window
  const expectedSig1 = generateTokenSignature(tokenTime, courseId, roomX, roomY);
  const expectedSig2 = generateTokenSignature(tokenTime - 15000, courseId, roomX, roomY);
  
  if (token === expectedSig1 || token === expectedSig2) {
    return { valid: true };
  }
  
  return { valid: false, reason: 'SIGNATURE_INVALID' };
}

/**
 * Calculates Euclidean distance between two flat coordinate coordinates on our campus blueprint map.
 */
export function calculateGeodistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}
