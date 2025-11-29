const API_BASE = "/api";

async function handleResponse(response) {
  if (!response.ok) {
    let message = `API 錯誤 (${response.status})`;
    try {
      const errorPayload = await response.json();
      message = errorPayload.error || message;
    } catch {}
    throw new Error(message);
  }
  return await response.json();
}

export async function fetchGrids() {
  try {
    const response = await fetch(`${API_BASE}/grids`);
    return await handleResponse(response);
  } catch (error) {
    console.error("[API] fetchGrids failed:", error);
    throw error;
  }
}

export async function fetchSegmentLog(segmentId) {
  try {
    const response = await fetch(`${API_BASE}/segments/${segmentId}/log`);
    return await handleResponse(response);
  } catch (error) {
    console.error("[API] fetchSegmentLog failed:", error);
    throw error;
  }
}

export async function postSegments(segments) {
  try {
    const response = await fetch(`${API_BASE}/segments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments }),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error("[API] postSegments failed:", error);
    throw error;
  }
}
