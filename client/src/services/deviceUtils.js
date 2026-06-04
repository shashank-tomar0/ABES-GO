export async function generateDeviceFingerprint() {
  try {
    // 1. Canvas Fingerprint Hash
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125,1,62,20);
    ctx.fillStyle = "#069";
    ctx.fillText("http://abes.edu", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("http://abes.edu", 4, 17);
    const canvasData = canvas.toDataURL();

    // 2. User Agent
    const ua = navigator.userAgent;

    // 3. Screen Dimensions
    const screenStr = `${screen.width}x${screen.height}`;

    // 4. WebGL Renderer
    let webglStr = "no-webgl";
    try {
      const gl = document.createElement("canvas").getContext("webgl");
      if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          webglStr = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch (e) { }

    const rawString = `${canvasData}|${ua}|${screenStr}|${webglStr}`;

    // Hash it using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(rawString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (err) {
    console.error("Fingerprint error", err);
    return "fallback-fingerprint-12345";
  }
}
