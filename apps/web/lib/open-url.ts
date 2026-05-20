/**
 * Abre URL em nova aba depois de um fetch assíncrono.
 * `window.open(url)` após await costuma retornar null (noopener / perda do gesto do clique)
 * mesmo quando a aba abre — não use isso como critério de bloqueio.
 */
export function openBlankTabForAsyncUrl(): Window | null {
  try {
    return window.open("about:blank", "_blank");
  } catch {
    return null;
  }
}

export function openUrlInNewTab(url: string, pendingTab?: Window | null): void {
  if (pendingTab && !pendingTab.closed) {
    try {
      pendingTab.location.href = url;
      return;
    } catch {
      try {
        pendingTab.close();
      } catch {
        /* ignore */
      }
    }
  }

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
