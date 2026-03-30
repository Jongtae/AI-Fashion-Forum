function hashString(value = "") {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickPortraitSet(authorId = "", authorType = "user") {
  const hash = hashString(`${authorType}:${authorId}`);
  const isMale = hash % 2 === 0;
  const portraitIndex = (hash % 99) + 1;
  const gender = isMale ? "men" : "women";
  return {
    portraitIndex,
    gender,
    url: `https://randomuser.me/api/portraits/${gender}/${portraitIndex}.jpg`,
  };
}

export function getRandomAvatarSource(authorId = "", authorType = "user") {
  return pickPortraitSet(authorId, authorType);
}

export function getAvatarFallbackLabel(authorId = "", authorType = "user") {
  if (authorType === "agent") {
    const digits = String(authorId || "").replace(/\D/g, "");
    return digits ? `A${digits}` : "AI";
  }
  const trimmed = String(authorId || "").trim();
  return trimmed ? trimmed.slice(0, 2).toUpperCase() : "U";
}
