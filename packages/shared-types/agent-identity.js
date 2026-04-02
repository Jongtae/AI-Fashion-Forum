const AGENT_AVATAR_PATHS = Array.from({ length: 19 }, (_, index) =>
  `/agent-avatars/agent-avatar-${String(index + 1).padStart(2, "0")}.png`,
);

const KOREAN_GIVEN_NAMES = [
  "Minseo",
  "Jisoo",
  "Suhyun",
  "Yuna",
  "Haeun",
  "Jimin",
  "Seojun",
  "Hyunwoo",
  "Daehyun",
  "Jihwan",
  "Sora",
  "Nari",
  "Mina",
  "Yujeong",
  "Taeyang",
  "Seungmin",
  "Jiwoo",
  "Hayoon",
  "Junho",
  "Nayeon",
  "Harin",
  "Sojin",
  "Hyejin",
  "Doyun",
  "Eunseo",
  "Haeri",
  "Seoyeon",
  "Yewon",
  "Sumin",
  "Yeji",
  "Jaehee",
  "Seyoung",
  "Haewon",
  "Jihye",
  "Naeun",
  "Miso",
  "Rin",
  "Juhye",
  "Minji",
  "Seulgi",
  "Dahyun",
  "Sohee",
  "Eunji",
  "Hana",
  "Soyeon",
  "Yuri",
  "Jiwon",
  "Seungah",
];

const KOREAN_FAMILY_NAMES = [
  "Kim",
  "Lee",
  "Park",
  "Choi",
  "Jung",
  "Kang",
  "Cho",
  "Yoon",
  "Jang",
  "Lim",
  "Shin",
  "Seo",
  "Moon",
  "Oh",
  "Ahn",
  "Ryu",
  "Bae",
  "Han",
  "Chun",
  "Gwon",
  "Baek",
  "Go",
  "Hwang",
  "Nam",
];

const JAPANESE_GIVEN_NAMES = [
  "Yui",
  "Haruto",
  "Mio",
  "Ren",
  "Aoi",
  "Yuto",
  "Hina",
  "Daiki",
  "Riko",
  "Sora",
  "Kaito",
  "Nana",
  "Yuna",
  "Rina",
  "Mei",
  "Riku",
  "Haru",
  "Kanna",
  "Shun",
  "Noa",
  "Rio",
  "Akari",
  "Kento",
  "Mika",
  "Saki",
  "Ayaka",
  "Rena",
  "Haruka",
  "Natsuki",
  "Yuka",
  "Mayu",
  "Asuka",
  "Chihiro",
  "Nanami",
  "Yuna",
  "Tsubasa",
  "Rio",
  "Mina",
  "Rei",
  "Kaede",
  "Koharu",
  "Miyu",
  "Tomomi",
  "Nozomi",
];

const JAPANESE_FAMILY_NAMES = [
  "Sato",
  "Suzuki",
  "Takahashi",
  "Tanaka",
  "Watanabe",
  "Ito",
  "Yamamoto",
  "Nakamura",
  "Kobayashi",
  "Kato",
  "Yoshida",
  "Yamada",
  "Sasaki",
  "Yamaguchi",
  "Matsumoto",
  "Ishikawa",
  "Kimura",
  "Shimizu",
  "Hayashi",
  "Saito",
  "Mori",
  "Igarashi",
  "Kondo",
  "Abe",
  "Fujita",
  "Okada",
  "Watanabe",
];

const GLOBAL_GIVEN_NAMES = [
  "Mina",
  "Noah",
  "Ivy",
  "Theo",
  "Lina",
  "Eden",
  "Aria",
  "Kai",
  "Mira",
  "Leo",
  "Juno",
  "Nico",
  "Luna",
  "Maya",
  "Iris",
  "Rae",
  "Skye",
  "Ari",
  "Nova",
  "Zoe",
  "Pia",
  "Mira",
];

const GLOBAL_FAMILY_NAMES = [
  "Chen",
  "Wong",
  "Patel",
  "Garcia",
  "Nguyen",
  "Hughes",
  "Santos",
  "Baker",
  "Reed",
  "Chung",
  "Walker",
  "Cole",
  "Lane",
  "Stone",
  "Brooks",
  "Parker",
  "Rivera",
  "Morgan",
  "Bell",
  "Ward",
];

function hashString(value = "") {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function isRawAgentId(value = "") {
  return /^A\d+$/i.test(String(value).trim());
}

function pickByHash(options = [], key = "") {
  if (!options.length) return "";
  const index = hashString(String(key)) % options.length;
  return options[index];
}

function pickLocale(authorId = "", authorType = "user", localeHint = "") {
  const hinted = String(localeHint || "").trim().toLowerCase();
  if (hinted) {
    return hinted;
  }

  const hash = hashString(`${authorType}:${authorId}`);
  if (authorType === "agent") {
    const bucket = hash % 100;
    return bucket < 58 ? "ko" : "ja";
  }

  return hash % 2 === 0 ? "ko" : "ja";
}

function pickHumanDisplayName(authorId = "", authorType = "user", localeHint = "") {
  const locale = pickLocale(authorId, authorType, localeHint);
  const suffixKey = `${authorType}:${authorId}:name`;

  if (locale === "ko") {
    const given = pickByHash(KOREAN_GIVEN_NAMES, `${suffixKey}:given`);
    const family = pickByHash(KOREAN_FAMILY_NAMES, `${suffixKey}:family`);
    return `${given} ${family}`;
  }

  if (locale === "ja") {
    const given = pickByHash(JAPANESE_GIVEN_NAMES, `${suffixKey}:given`);
    const family = pickByHash(JAPANESE_FAMILY_NAMES, `${suffixKey}:family`);
    return `${given} ${family}`;
  }

  const given = pickByHash(GLOBAL_GIVEN_NAMES, `${suffixKey}:given`);
  const family = pickByHash(GLOBAL_FAMILY_NAMES, `${suffixKey}:family`);
  return `${given} ${family}`;
}

function slugifyIdentity(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function pickAvatarUrl(authorId = "", authorType = "user", localeHint = "") {
  const locale = pickLocale(authorId, authorType, localeHint);
  const hash = hashString(`${authorType}:${authorId}:${locale}`);
  const avatarIndex = hash % AGENT_AVATAR_PATHS.length;
  return {
    avatarUrl: AGENT_AVATAR_PATHS[avatarIndex],
    avatarLocale: locale,
  };
}

function normalizeProvidedDisplayName(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  if (isRawAgentId(text)) return "";
  return text;
}

function humanizeIdentifier(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  if (isRawAgentId(text)) return text.toUpperCase();

  const pieces = text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (!pieces.length) {
    return text;
  }

  return pieces
    .map((piece) => {
      if (/^\d+$/.test(piece)) return piece;
      return piece.charAt(0).toUpperCase() + piece.slice(1).toLowerCase();
    })
    .join(" ");
}

export function resolveAuthorIdentity({
  authorId = "",
  authorType = "user",
  displayName = "",
  handle = "",
  avatarUrl = "",
  localeHint = "",
} = {}) {
  const normalizedAuthorId = String(authorId || "").trim();
  const normalizedDisplayName = normalizeProvidedDisplayName(displayName);
  const normalizedHandle = normalizeProvidedDisplayName(handle);
  const locale = pickLocale(normalizedAuthorId, authorType, localeHint);
  const generatedDisplayName =
    authorType === "agent"
      ? normalizedAuthorId
        ? pickHumanDisplayName(normalizedAuthorId, authorType, locale)
        : pickHumanDisplayName(String(Date.now()), authorType, locale)
      : humanizeIdentifier(normalizedAuthorId || normalizedHandle || normalizedDisplayName || "User");
  const resolvedDisplayName = normalizedDisplayName || generatedDisplayName;
  const resolvedHandle =
    normalizedHandle ||
    resolvedDisplayName ||
    slugifyIdentity(normalizedAuthorId) ||
    "agent";
  const resolvedAvatar = avatarUrl || pickAvatarUrl(normalizedAuthorId || resolvedDisplayName, authorType, locale).avatarUrl;

  return {
    authorId: normalizedAuthorId,
    authorType,
    displayName: resolvedDisplayName,
    handle: resolvedHandle,
    avatarUrl: resolvedAvatar,
    avatarLocale: locale,
  };
}

export function getAuthorInitials(value = "") {
  const text = String(value || "").trim();
  if (!text) return "AI";

  const pieces = text
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!pieces.length) {
    return text.slice(0, 2).toUpperCase();
  }

  return pieces
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export {
  AGENT_AVATAR_PATHS,
  hashString,
  isRawAgentId,
  pickAvatarUrl,
  pickHumanDisplayName,
  pickLocale,
  slugifyIdentity,
};
