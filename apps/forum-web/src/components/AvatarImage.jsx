import React from "react";
import { getAvatarFallbackLabel, getRandomAvatarSource } from "../lib/avatar-source.js";

export default function AvatarImage({
  authorId,
  authorType = "user",
  displayName = "",
  avatarUrl = "",
  avatarLocale = "",
  handle = "",
  size = 42,
  style = {},
}) {
  const source = React.useMemo(
    () => getRandomAvatarSource(authorId, authorType, { displayName, avatarUrl, avatarLocale, handle }),
    [authorId, authorType, displayName, avatarUrl, avatarLocale, handle],
  );
  const fallbackLabel = React.useMemo(
    () => getAvatarFallbackLabel(authorId, authorType, { displayName, avatarUrl, avatarLocale, handle }),
    [authorId, authorType, displayName, avatarUrl, avatarLocale, handle],
  );
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [source.url]);

  if (imageError) {
    return (
      <div
        style={{
          ...styles.fallback,
          width: size,
          height: size,
          ...style,
        }}
        aria-label={`${displayName || authorId || "user"} avatar`}
      >
        {fallbackLabel}
      </div>
    );
  }

  return (
    <img
      src={source.url}
      alt={`${displayName || authorId || "user"} avatar`}
      onError={() => setImageError(true)}
      loading="lazy"
      style={{
        ...styles.image,
        width: size,
        height: size,
        ...style,
      }}
    />
  );
}

const styles = {
  image: {
    display: "block",
    objectFit: "cover",
    borderRadius: "50%",
    background: "#f3f4f6",
  },
  fallback: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%)",
    color: "#1f2937",
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: "0.04em",
  },
};
