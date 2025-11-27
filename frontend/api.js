const API_BASE = "/api";

export async function fetchGrids() {
  const response = await fetch(`${API_BASE}/grids`);
  if (!response.ok) {
    throw new Error("API failed");
  }
  return await response.json();
}

export async function fetchSegmentLog(segmentId) {
  const response = await fetch(`${API_BASE}/segments/${segmentId}/log`);
  if (!response.ok) {
    throw new Error("log fetch failed");
  }
  return await response.json();
}

export async function postSegments(segments) {
  const response = await fetch(`${API_BASE}/segments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ segments }),
  });
  
  if (!response.ok) {
    let message = "分類服務回傳錯誤";
    try {
      const errorPayload = await response.json();
      message = errorPayload.error || JSON.stringify(errorPayload);
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  
  return await response.json();
}
