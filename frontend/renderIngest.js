export function renderIngestResults(ingestResultsEl, ingestTableBodyEl, results) {
    if (!ingestResultsEl || !ingestTableBodyEl) return;
    if (!results.length) {
        ingestResultsEl.classList.add("hidden");
        ingestTableBodyEl.innerHTML = "";
        return;
    }
    ingestResultsEl.classList.remove("hidden");
    ingestTableBodyEl.innerHTML = results
        .map(
            (item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${(item.snippet || "").slice(0, 60)}</td>
          <td>#${item.grid_id}</td>
          <td class="status-${item.status}">${item.status}</td>
          <td>${item.summary_notes || ""}</td>
          <td>${item.classifier || ""}</td>
          <td>${item.error || ""}</td>
        </tr>
      `
        )
        .join("");
}
