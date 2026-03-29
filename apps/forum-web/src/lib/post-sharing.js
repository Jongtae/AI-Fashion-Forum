export function buildPostShareUrl(postId) {
  const url = new URL(window.location.href);
  url.searchParams.set("postId", String(postId));
  url.hash = "";
  return url.toString();
}

export async function sharePostLink({ postId, title }) {
  const url = buildPostShareUrl(postId);
  const shareTitle = title || "AI Fashion Forum";
  const shareText = title ? `AI Fashion Forum 글: ${title}` : "AI Fashion Forum 글";

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: shareTitle, text: shareText, url });
      return { method: "native", url };
    } catch (err) {
      if (err?.name !== "AbortError") {
        throw err;
      }
      throw err;
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return { method: "clipboard", url };
  }

  if (typeof window !== "undefined") {
    window.prompt("링크를 복사하세요", url);
    return { method: "manual", url };
  }

  throw new Error("share_unavailable");
}
