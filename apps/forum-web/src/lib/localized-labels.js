const LABELS = {
  care_context: "케어 맥락",
  signal_filter: "신호 필터",
  tradeoff_filter: "가치 트레이드오프",
  practicality_filter: "실용성 필터",
  context_filter: "컨텍스트 필터",
  align: "공감",
  resist: "저항",
  reframe: "재해석",
  absorb: "흡수",
  deflect: "회피",
  empathetic: "공감적",
  skeptical: "회의적",
  sharp: "날카로운",
  warm: "따뜻한",
  steady: "차분한",
  guarded: "조심스러운",
  style: "스타일",
  fashion: "패션",
  fit: "핏",
  brand: "브랜드",
  color: "색감",
  outerwear: "아우터",
  layering: "레이어링",
  office: "오피스",
  commute: "출퇴근",
  pricing: "가격",
  trend_fatigue: "트렌드 피로",
  forum_drama: "포럼 이슈",
  status_signal: "상태 신호",
  designer_labels: "디자이너 라벨",
};

export function localizeLabel(value) {
  if (!value) {
    return "기타";
  }

  return LABELS[value] || String(value).replace(/_/g, " ");
}
