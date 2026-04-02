import { getAuthorInitials, resolveAuthorIdentity } from "@ai-fashion-forum/shared-types";

export function getRandomAvatarSource(authorId = "", authorType = "user", options = {}) {
  const identity = resolveAuthorIdentity({
    authorId,
    authorType,
    displayName: options.displayName || "",
    handle: options.handle || "",
    avatarUrl: options.avatarUrl || "",
    localeHint: options.avatarLocale || options.localeHint || "",
  });

  return {
    url: identity.avatarUrl,
    locale: identity.avatarLocale,
    displayName: identity.displayName,
    authorId: identity.authorId,
  };
}

export function getAvatarFallbackLabel(authorId = "", authorType = "user", options = {}) {
  const displayName = String(options.displayName || "").trim();
  if (displayName) {
    return getAuthorInitials(displayName);
  }

  const identity = resolveAuthorIdentity({
    authorId,
    authorType,
    displayName: options.displayName || "",
    handle: options.handle || "",
    avatarUrl: options.avatarUrl || "",
    localeHint: options.avatarLocale || options.localeHint || "",
  });

  if (identity.displayName) {
    return getAuthorInitials(identity.displayName);
  }

  const trimmed = String(authorId || "").trim();
  return trimmed ? trimmed.slice(0, 2).toUpperCase() : "AI";
}
