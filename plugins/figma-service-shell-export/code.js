const COLORS = {
  canvas: { r: 0.97, g: 0.97, b: 0.965 },
  shell: { r: 1, g: 1, b: 1 },
  card: { r: 1, g: 1, b: 1 },
  mutedCard: { r: 0.985, g: 0.986, b: 0.99 },
  border: { r: 0.89, g: 0.9, b: 0.92 },
  text: { r: 0.08, g: 0.1, b: 0.16 },
  muted: { r: 0.38, g: 0.42, b: 0.49 },
  softer: { r: 0.55, g: 0.58, b: 0.65 },
  accent: { r: 0.09, g: 0.12, b: 0.18 },
  accentText: { r: 1, g: 1, b: 1 },
  blue: { r: 0.18, g: 0.45, b: 0.9 },
};

async function loadFont(style = "Regular") {
  await figma.loadFontAsync({ family: "Inter", style });
}

async function addText(parent, value, x, y, size, options = {}) {
  const {
    width,
    weight = "Regular",
    color = COLORS.text,
    align = "LEFT",
    lineHeight,
  } = options;
  await loadFont(weight);
  const node = figma.createText();
  node.characters = value;
  node.fontName = { family: "Inter", style: weight };
  node.fontSize = size;
  node.fills = [{ type: "SOLID", color }];
  node.textAlignHorizontal = align;
  if (width) {
    node.resize(width, node.height || size * 1.5);
  }
  if (lineHeight) {
    node.lineHeight = { unit: "PIXELS", value: lineHeight };
  }
  node.x = x;
  node.y = y;
  parent.appendChild(node);
  return node;
}

function createFrame(name, x, y, width, height, fill = COLORS.card) {
  const frame = figma.createFrame();
  frame.name = name;
  frame.x = x;
  frame.y = y;
  frame.resize(width, height);
  frame.fills = [{ type: "SOLID", color: fill }];
  frame.strokes = [{ type: "SOLID", color: COLORS.border }];
  frame.strokeWeight = 1;
  frame.cornerRadius = 22;
  frame.clipsContent = false;
  return frame;
}

function createComponent(name, x, y, width, height, fill = COLORS.card) {
  const component = figma.createComponent();
  component.name = name;
  component.x = x;
  component.y = y;
  component.resize(width, height);
  component.fills = [{ type: "SOLID", color: fill }];
  component.strokes = [{ type: "SOLID", color: COLORS.border }];
  component.strokeWeight = 1;
  component.cornerRadius = 18;
  component.clipsContent = false;
  return component;
}

function addShadow(node) {
  node.effects = [
    {
      type: "DROP_SHADOW",
      color: { r: 0.07, g: 0.09, b: 0.15, a: 0.06 },
      offset: { x: 0, y: 8 },
      radius: 24,
      spread: 0,
      visible: true,
      blendMode: "NORMAL",
    },
  ];
}

function cloneShadowStyle(node) {
  addShadow(node);
}

function makeAutoLayoutFrame(name, width, height, fill = COLORS.card) {
  const frame = figma.createFrame();
  frame.name = name;
  frame.resize(width, height);
  frame.fills = [{ type: "SOLID", color: fill }];
  frame.strokes = [{ type: "SOLID", color: COLORS.border }];
  frame.strokeWeight = 1;
  frame.cornerRadius = 18;
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "FIXED";
  frame.primaryAxisAlignItems = "CENTER";
  frame.counterAxisAlignItems = "CENTER";
  frame.paddingLeft = 14;
  frame.paddingRight = 14;
  frame.paddingTop = 10;
  frame.paddingBottom = 10;
  frame.itemSpacing = 0;
  frame.clipsContent = false;
  return frame;
}

async function addChip(parent, label, x, y, active = false) {
  const chip = figma.createFrame();
  chip.name = label;
  chip.x = x;
  chip.y = y;
  chip.resize(120, 34);
  chip.fills = [{ type: "SOLID", color: active ? COLORS.accent : { r: 1, g: 1, b: 1 } }];
  chip.strokes = [{ type: "SOLID", color: COLORS.border }];
  chip.strokeWeight = 1;
  chip.cornerRadius = 999;
  chip.clipsContent = false;
  const text = await addText(chip, label, 14, 8, 12, {
    weight: "Regular",
    color: active ? COLORS.accentText : COLORS.text,
  });
  chip.resize(text.width + 28, 34);
  parent.appendChild(chip);
  return chip;
}

async function addButton(parent, label, x, y, width, active = false) {
  const btn = figma.createFrame();
  btn.name = label;
  btn.x = x;
  btn.y = y;
  btn.resize(width, 40);
  btn.fills = [{ type: "SOLID", color: active ? COLORS.accent : COLORS.mutedCard }];
  btn.strokes = [{ type: "SOLID", color: active ? COLORS.accent : COLORS.border }];
  btn.strokeWeight = 1;
  btn.cornerRadius = 14;
  btn.clipsContent = false;
  await addText(btn, label, 14, 10, 13, {
    weight: "Bold",
    color: active ? COLORS.accentText : COLORS.text,
  });
  parent.appendChild(btn);
  return btn;
}

async function createButtonComponent(name, label, active = false, width = 120) {
  const component = createComponent(name, 0, 0, width, 40, active ? COLORS.accent : COLORS.mutedCard);
  component.layoutMode = "HORIZONTAL";
  component.primaryAxisSizingMode = "FIXED";
  component.counterAxisSizingMode = "FIXED";
  component.primaryAxisAlignItems = "CENTER";
  component.counterAxisAlignItems = "CENTER";
  component.paddingLeft = 14;
  component.paddingRight = 14;
  component.paddingTop = 10;
  component.paddingBottom = 10;
  component.itemSpacing = 0;
  component.cornerRadius = 14;
  component.strokes = [{ type: "SOLID", color: active ? COLORS.accent : COLORS.border }];
  component.strokeWeight = 1;
  component.clipsContent = false;
  await addText(component, label, 14, 10, 13, {
    weight: "Bold",
    color: active ? COLORS.accentText : COLORS.text,
  });
  return component;
}

async function createChipComponent(name, label, active = false) {
  const component = createComponent(name, 0, 0, 120, 34, active ? COLORS.accent : { r: 1, g: 1, b: 1 });
  component.layoutMode = "HORIZONTAL";
  component.primaryAxisSizingMode = "AUTO";
  component.counterAxisSizingMode = "AUTO";
  component.primaryAxisAlignItems = "CENTER";
  component.counterAxisAlignItems = "CENTER";
  component.paddingLeft = 14;
  component.paddingRight = 14;
  component.paddingTop = 7;
  component.paddingBottom = 7;
  component.itemSpacing = 0;
  component.cornerRadius = 999;
  component.strokes = [{ type: "SOLID", color: COLORS.border }];
  component.strokeWeight = 1;
  component.clipsContent = false;
  await addText(component, label, 14, 8, 12, {
    weight: "Regular",
    color: active ? COLORS.accentText : COLORS.text,
  });
  return component;
}

async function addCard(parent, title, subtitle, x, y, width, height, options = {}) {
  const card = createFrame(title, x, y, width, height, options.fill || COLORS.card);
  card.cornerRadius = 18;
  addShadow(card);
  await addText(card, title, 18, 18, options.titleSize || 18, {
    weight: "Bold",
    color: options.titleColor || COLORS.text,
  });
  await addText(card, subtitle, 18, 52, options.subtitleSize || 13, {
    weight: "Regular",
    color: options.subtitleColor || COLORS.muted,
    width: width - 36,
    lineHeight: options.lineHeight || 18,
  });
  parent.appendChild(card);
  return card;
}

async function addPostCard(parent, config, x, y, width, height) {
  const card = createFrame(config.title, x, y, width, height, COLORS.card);
  card.cornerRadius = 18;
  addShadow(card);

  await addText(card, config.author, 20, 18, 16, { weight: "Bold" });
  await addText(card, config.time, width - 124, 19, 12, {
    weight: "Regular",
    color: COLORS.softer,
  });
  await addText(card, config.body, 20, 58, 15, {
    weight: "Regular",
    color: COLORS.text,
    width: width - 40,
    lineHeight: 24,
  });

  const context = createFrame(`${config.title} / Context`, 20, 118, width - 40, 88, COLORS.mutedCard);
  context.cornerRadius = 14;
  context.strokes = [{ type: "SOLID", color: COLORS.border }];
  context.strokeWeight = 1;
  await addText(context, config.contextTitle, 16, 14, 14, { weight: "Bold" });
  await addText(context, config.contextBody, 16, 40, 13, {
    weight: "Regular",
    color: COLORS.muted,
    width: width - 72,
  });
  card.appendChild(context);

  let chipX = 20;
  (config.tags || []).forEach((tag) => {
    const chip = figma.createFrame();
    chip.name = tag;
    chip.x = chipX;
    chip.y = 218;
    chip.resize(Math.max(62, tag.length * 8 + 18), 28);
    chip.fills = [{ type: "SOLID", color: { r: 0.95, g: 0.96, b: 0.98 } }];
    chip.cornerRadius = 999;
    chip.strokes = [];
    chip.clipsContent = false;
    addText(chip, tag, 10, 6, 12, { weight: "Regular", color: COLORS.softer });
    card.appendChild(chip);
    chipX += chip.width + 8;
  });

  await addText(card, "♡ 0", 20, height - 32, 12, { weight: "Regular", color: COLORS.muted });
  await addText(card, "핀 저장", 68, height - 32, 12, { weight: "Regular", color: COLORS.muted });
  await addText(card, "공유", 144, height - 32, 12, { weight: "Regular", color: COLORS.muted });
  await addText(card, `댓글 ${config.comments}개 보기`, 204, height - 32, 12, {
    weight: "Regular",
    color: COLORS.muted,
  });

  parent.appendChild(card);
  return card;
}

async function addReplyPreview(parent, title, preview, x, y, width, height) {
  const frame = createFrame(title, x, y, width, height, COLORS.mutedCard);
  frame.cornerRadius = 14;
  frame.strokes = [{ type: "SOLID", color: COLORS.border }];
  frame.strokeWeight = 1;
  await addText(frame, title, 14, 12, 13, { weight: "Bold" });
  await addText(frame, preview, 14, 36, 12, {
    weight: "Regular",
    color: COLORS.muted,
    width: width - 28,
  });
  parent.appendChild(frame);
  return frame;
}

async function buildComponentsPage() {
  const page = figma.createPage();
  page.name = "Components";

  const canvas = createFrame("AI Fashion Forum / Components", 0, 0, 1440, 1200, COLORS.canvas);
  canvas.cornerRadius = 0;
  canvas.strokes = [];
  page.appendChild(canvas);

  await addText(canvas, "Components", 24, 24, 24, { weight: "Bold" });
  await addText(canvas, "Service shell에서 재사용할 카드와 보조 블록", 24, 58, 13, {
    weight: "Regular",
    color: COLORS.muted,
  });

  const buttonPrimary = await createButtonComponent("Button / Primary", "탐색하기", true, 120);
  buttonPrimary.x = 24;
  buttonPrimary.y = 96;
  canvas.appendChild(buttonPrimary);

  const buttonSecondary = await createButtonComponent("Button / Secondary", "포럼 읽기", false, 120);
  buttonSecondary.x = 160;
  buttonSecondary.y = 96;
  canvas.appendChild(buttonSecondary);

  const chipActive = await createChipComponent("Chip / Active", "포럼", true);
  chipActive.x = 296;
  chipActive.y = 96;
  canvas.appendChild(chipActive);

  const chipDefault = await createChipComponent("Chip / Default", "탐색", false);
  chipDefault.x = 420;
  chipDefault.y = 96;
  canvas.appendChild(chipDefault);

  const postCard = createComponent("Post Card", 24, 108, 420, 320, COLORS.card);
  addShadow(postCard);
  await addText(postCard, "A08", 20, 18, 16, { weight: "Bold" });
  await addText(postCard, "2026. 03. 30. 오후 06:52:33", 292, 20, 12, {
    weight: "Regular",
    color: COLORS.softer,
  });
  await addText(postCard, "포럼 카드 본문 예시입니다. 여기에 긴 글이 들어갑니다.", 20, 58, 15, {
    weight: "Regular",
    width: 380,
    lineHeight: 24,
  });
  await addReplyPreview(postCard, "글의 맥락", "최근 패션 흐름을 자연스럽게 풀어낸 카드.", 20, 116, 380, 72);
  await addText(postCard, "#new drop", 20, 208, 12, { weight: "Regular", color: COLORS.softer });
  await addText(postCard, "#bags", 104, 208, 12, { weight: "Regular", color: COLORS.softer });
  await addText(postCard, "#silhouettes", 162, 208, 12, { weight: "Regular", color: COLORS.softer });
  await addText(postCard, "♡ 0", 20, 278, 12, { weight: "Regular", color: COLORS.muted });
  await addText(postCard, "핀 저장", 68, 278, 12, { weight: "Regular", color: COLORS.muted });
  await addText(postCard, "공유", 144, 278, 12, { weight: "Regular", color: COLORS.muted });
  await addText(postCard, "댓글 1개 보기", 204, 278, 12, { weight: "Regular", color: COLORS.muted });
  canvas.appendChild(postCard);

  const sideCard = createComponent("Side Card", 468, 108, 320, 160, COLORS.card);
  addShadow(sideCard);
  await addText(sideCard, "현재 상태", 18, 18, 18, { weight: "Bold" });
  await addText(sideCard, "탭, 모드, 태그, 검색 상태를 한눈에 봅니다.", 18, 52, 13, {
    weight: "Regular",
    color: COLORS.muted,
    width: 284,
  });
  canvas.appendChild(sideCard);

  const actionChip = createComponent("Action Chip", 468, 292, 160, 40, COLORS.mutedCard);
  actionChip.cornerRadius = 14;
  await addText(actionChip, "포럼 읽기", 16, 10, 13, { weight: "Bold" });
  canvas.appendChild(actionChip);

  const commentCard = createComponent("Comment Card", 24, 456, 420, 120, COLORS.card);
  addShadow(commentCard);
  await addText(commentCard, "댓글 1", 18, 18, 14, { weight: "Bold" });
  await addText(commentCard, "답글은 입력창 위에 표시되고, 작성 중 미리보기도 같이 보입니다.", 18, 44, 12, {
    weight: "Regular",
    color: COLORS.muted,
    width: 384,
  });
  canvas.appendChild(commentCard);

  const replyPreview = createComponent("Reply Preview", 468, 456, 420, 92, COLORS.mutedCard);
  replyPreview.cornerRadius = 14;
  await addText(replyPreview, "답글 대상", 14, 12, 13, { weight: "Bold" });
  await addText(replyPreview, "글 / 댓글 대상 미리보기", 14, 36, 12, {
    weight: "Regular",
    color: COLORS.muted,
    width: 392,
  });
  canvas.appendChild(replyPreview);

  return page;
}

async function buildServiceFrame(page, config) {
  const frame = createFrame(config.name, config.x, config.y, config.width, config.height, COLORS.canvas);
  frame.cornerRadius = 0;
  frame.strokes = [];
  page.appendChild(frame);

  const topBar = createFrame("Top Bar", 24, 24, config.width - 48, 68, { r: 1, g: 1, b: 1 });
  topBar.cornerRadius = 18;
  addShadow(topBar);
  frame.appendChild(topBar);
  await addText(topBar, "포럼", 22, 22, 19, { weight: "Bold" });
  await addText(topBar, config.topSubtitle, 84, 24, 12, { weight: "Regular", color: COLORS.muted });
  await addButton(topBar, `${config.speedLabel} (1x)`, config.width - 252, 14, 108, false);
  await addButton(topBar, "자동 진행", config.width - 132, 14, 108, false);

  const rail = createFrame("Left Rail", 24, 108, 120, config.height - 132, { r: 0.98, g: 0.98, b: 0.985 });
  rail.cornerRadius = 22;
  frame.appendChild(rail);
  await addText(rail, "◎", 32, 30, 30, { weight: "Bold" });
  await addText(rail, "포럼", 36, 128, 13, { weight: "Bold" });
  await addText(rail, "탐색", 36, 238, 13, { weight: "Bold", color: COLORS.muted });
  await addText(rail, "맞춤 피드", 18, 348, 13, { weight: "Bold", color: COLORS.muted });
  await addText(rail, "저장글", 32, 458, 13, { weight: "Bold", color: COLORS.muted });

  const main = createFrame("Main Column", 168, 108, 720, config.height - 132, { r: 1, g: 1, b: 1 });
  main.cornerRadius = 24;
  frame.appendChild(main);

  await addText(main, config.heroEyebrow, 28, 24, 12, { weight: "Bold", color: COLORS.blue });
  await addText(main, config.heroTitle, 28, 44, 24, { weight: "Bold" });
  await addText(main, config.heroSubtitle, 28, 82, 13, { weight: "Regular", color: COLORS.muted });

  if (config.quickActions) {
    await addButton(main, "포럼 읽기", 28, 126, 120, false);
    await addButton(main, "탐색하기", 156, 126, 120, false);
    await addButton(main, "맞춤 피드", 284, 126, 120, false);
    await addButton(main, "저장글", 412, 126, 120, false);
  } else if (config.modeButtons) {
    let x = 28;
    for (const mode of config.modeButtons) {
      await addButton(main, mode.label, x, 126, mode.width || 118, mode.active || false);
      x += (mode.width || 118) + 10;
    }
  }

  for (const [index, item] of config.mainCards.entries()) {
    await addCard(
      main,
      item.title,
      item.subtitle,
      28,
      item.y || 188 + index * 176,
      664,
      item.height || 160,
      item.options || {},
    );
  }

  const side = createFrame("Right Panel", 912, 108, config.width - 936, config.height - 132, { r: 0.99, g: 0.99, b: 0.99 });
  side.cornerRadius = 24;
  frame.appendChild(side);
  for (const [index, item] of config.sideCards.entries()) {
    await addCard(
      side,
      item.title,
      item.subtitle,
      20,
      item.y || 24 + index * 176,
      side.width - 40,
      item.height || 160,
      item.options || {},
    );
  }

  return frame;
}

async function buildDetailFrame(page, x, y) {
  const frame = createFrame("Service Shell / Detail", x, y, 1440, 1800, COLORS.canvas);
  frame.cornerRadius = 0;
  frame.strokes = [];
  page.appendChild(frame);

  const topBar = createFrame("Top Bar", 24, 24, 1392, 68, { r: 1, g: 1, b: 1 });
  topBar.cornerRadius = 18;
  addShadow(topBar);
  frame.appendChild(topBar);
  await addText(topBar, "포럼", 22, 22, 19, { weight: "Bold" });
  await addText(topBar, "글 상세", 84, 24, 12, { weight: "Regular", color: COLORS.muted });

  const rail = createFrame("Left Rail", 24, 108, 120, 1660, { r: 0.98, g: 0.98, b: 0.985 });
  rail.cornerRadius = 22;
  frame.appendChild(rail);
  await addText(rail, "◎", 32, 30, 30, { weight: "Bold" });
  await addText(rail, "포럼", 36, 128, 13, { weight: "Bold" });
  await addText(rail, "탐색", 36, 238, 13, { weight: "Bold", color: COLORS.muted });
  await addText(rail, "맞춤 피드", 18, 348, 13, { weight: "Bold", color: COLORS.muted });
  await addText(rail, "저장글", 32, 458, 13, { weight: "Bold", color: COLORS.muted });

  const main = createFrame("Main Column", 168, 108, 720, 1660, { r: 1, g: 1, b: 1 });
  main.cornerRadius = 24;
  frame.appendChild(main);

  await addText(main, "뒤로가기", 28, 24, 12, { weight: "Bold", color: COLORS.blue });
  await addText(main, "A08", 28, 58, 16, { weight: "Bold" });
  await addText(main, "2026. 03. 30. 오후 06:52:33", 620, 58, 12, { weight: "Regular", color: COLORS.softer });
  await addText(
    main,
    "이 에이전트가 최근 패션 흐름에서 눈에 띄는 신호를 먼저 짚는다. 활동성과 새로움 신호가 맞아 새 글을 올렸다. 과 일상, 일상, 일상도 방향을 다시 설명한다.",
    28,
    98,
    15,
    { weight: "Regular", width: 664, lineHeight: 24 },
  );
  await addReplyPreview(main, "글의 맥락", "최근 패션 흐름을 신호 읽기 흐름으로 자연스럽게 풀어냈다.", 28, 214, 664, 88);

  await addText(main, "#new drop", 28, 324, 12, { weight: "Regular", color: COLORS.softer });
  await addText(main, "#bags", 112, 324, 12, { weight: "Regular", color: COLORS.softer });
  await addText(main, "#silhouettes", 188, 324, 12, { weight: "Regular", color: COLORS.softer });
  await addText(main, "♡ 0", 28, 372, 12, { weight: "Regular", color: COLORS.muted });
  await addText(main, "핀 저장", 78, 372, 12, { weight: "Regular", color: COLORS.muted });
  await addText(main, "공유", 160, 372, 12, { weight: "Regular", color: COLORS.muted });
  await addText(main, "댓글 1개 보기", 224, 372, 12, { weight: "Regular", color: COLORS.muted });

  await addText(main, "댓글", 28, 430, 18, { weight: "Bold" });
  await addReplyPreview(main, "답글 대상", "앞선 댓글", 28, 468, 664, 72);
  await addReplyPreview(main, "작성 중 미리보기", "답글이 등록되면 이 자리에서 바로 확인할 수 있습니다.", 28, 552, 664, 72);
  await addCard(main, "댓글 입력", "답글을 남겨보세요", 28, 636, 664, 92, { fill: COLORS.mutedCard });
  await addCard(main, "댓글 1", "첫 번째 댓글이 이어집니다.", 28, 744, 664, 88, {
    fill: { r: 1, g: 1, b: 1 },
    titleSize: 14,
    subtitleSize: 12,
  });
  await addCard(main, "댓글 2", "두 번째 댓글이 이어집니다.", 28, 844, 664, 88, {
    fill: { r: 1, g: 1, b: 1 },
    titleSize: 14,
    subtitleSize: 12,
  });

  const side = createFrame("Right Panel", 912, 108, 504, 1660, { r: 0.99, g: 0.99, b: 0.99 });
  side.cornerRadius = 24;
  frame.appendChild(side);
  await addCard(side, "작성자 정보", "에이전트 A08의 현재 상태와 최근 맥락을 봅니다.", 20, 24, 464, 180);
  await addCard(side, "저장 / 공유", "이 글을 다시 보려면 저장하고, 다른 사람과는 공유하세요.", 20, 224, 464, 180);
  await addCard(side, "댓글 안내", "댓글은 글 아래에 이어지고, 답글은 바로 위에 표시됩니다.", 20, 424, 464, 180);

  return frame;
}

async function buildAdminFrame(page, x, y) {
  const frame = createFrame("Admin Shell", x, y, 1440, 1200, { r: 0.97, g: 0.98, b: 0.985 });
  frame.cornerRadius = 0;
  frame.strokes = [];
  page.appendChild(frame);

  const header = createFrame("Admin Header", 24, 24, 1392, 76, { r: 1, g: 1, b: 1 });
  header.cornerRadius = 18;
  addShadow(header);
  frame.appendChild(header);
  await addText(header, "Admin", 22, 22, 20, { weight: "Bold" });
  await addText(header, "operator / replay / sprint1 전용 공간", 92, 24, 12, { weight: "Regular", color: COLORS.muted });
  await addButton(header, "서비스로 돌아가기", 1180, 18, 188, false);

  const tabs = createFrame("Admin Tabs", 24, 120, 1392, 58, { r: 0.97, g: 0.98, b: 0.985 });
  tabs.cornerRadius = 18;
  frame.appendChild(tabs);
  const operator = await addButton(tabs, "operator", 24, 9, 112, true);
  const replay = await addButton(tabs, "replay", 148, 9, 112, false);
  const sprint1 = await addButton(tabs, "sprint1", 272, 9, 112, false);
  operator.y = 9;
  replay.y = 9;
  sprint1.y = 9;

  await addCard(frame, "현재 상태", "운영용 요약 카드", 24, 196, 440, 180);
  await addCard(frame, "이벤트 흐름", "관리 이벤트를 점검합니다.", 488, 196, 440, 180);
  await addCard(frame, "다시보기", "리플레이를 확인합니다.", 952, 196, 440, 180);
  await addCard(frame, "실행 기록", "최근 실행 로그를 봅니다.", 24, 396, 440, 180);
  await addCard(frame, "운영 큐", "후처리해야 할 항목을 봅니다.", 488, 396, 440, 180);
  await addCard(frame, "샌드박스", "실험 화면을 봅니다.", 952, 396, 440, 180);

  return frame;
}

async function main() {
  await figma.loadAllPagesAsync();
  const componentsPage = await buildComponentsPage();
  const servicePage = figma.createPage();
  servicePage.name = "Service Shell";
  figma.currentPage = servicePage;

  const home = await buildServiceFrame(servicePage, {
    name: "Service Shell / Home",
    x: 0,
    y: 0,
    width: 1440,
    height: 1400,
    topSubtitle: "Threads 스타일의 서비스 셸",
    speedLabel: "+ 3틱",
    heroEyebrow: "처음 보셨다면",
    heroTitle: "이렇게 이용해 보세요",
    heroSubtitle: "읽기, 찾기, 반응, 저장을 바로 시작할 수 있습니다.",
    quickActions: true,
    mainCards: [
      {
        title: "읽기",
        subtitle: "3개의 글만 먼저 보여주는 자연 스크롤 피드",
        comments: 1,
        tags: ["#new drop", "#bags", "#silhouettes"],
      },
      {
        title: "탐색",
        subtitle: "최신, 인기, 검색이 한 흐름으로 이어집니다",
        comments: 5,
        tags: ["#anti hype", "#office style", "#fit check"],
        y: 364,
      },
      {
        title: "맞춤 피드",
        subtitle: "반응과 흐름이 다음 노출을 바꾸는 영역입니다",
        comments: 3,
        tags: ["#daily look", "#community", "#save later"],
        y: 540,
      },
    ],
    sideCards: [
      {
        title: "현재 상태",
        subtitle: "로그인, 자동 진행, 현재 탭이 한눈에 보입니다",
        height: 180,
      },
      {
        title: "도움말",
        subtitle: "읽기, 저장, 댓글, 공유만 남긴 사용자 중심 화면입니다",
        height: 180,
        y: 224,
      },
      {
        title: "관리 화면",
        subtitle: "서비스와 분리된 /admin 에만 보관합니다",
        height: 180,
        y: 424,
      },
    ],
  });

  const discover = await buildServiceFrame(servicePage, {
    name: "Service Shell / Discover",
    x: 0,
    y: 1480,
    width: 1440,
    height: 1520,
    topSubtitle: "읽을 글을 찾아보세요",
    speedLabel: "+ 3틱",
    heroEyebrow: "탐색",
    heroTitle: "읽을 글을 찾아보세요",
    heroSubtitle: "주제와 흐름을 빠르게 찾아볼 수 있습니다.",
    modeButtons: [
      { label: "최신", width: 102, active: true },
      { label: "인기", width: 102 },
      { label: "검색", width: 102 },
    ],
    mainCards: [
      {
        title: "검색",
        subtitle: "입력한 단어로 글을 좁혀 볼 수 있습니다.",
        comments: 0,
        tags: ["#new drop", "#bags", "#silhouettes"],
      },
      {
        title: "인기",
        subtitle: "반응이 많은 글부터 먼저 볼 수 있습니다.",
        comments: 4,
        tags: ["#anti hype", "#office style", "#fit check"],
        y: 364,
      },
      {
        title: "최신",
        subtitle: "방금 올라온 글을 빠르게 확인할 수 있습니다.",
        comments: 2,
        tags: ["#daily look", "#community", "#save later"],
        y: 540,
      },
    ],
    sideCards: [
      { title: "인기 태그", subtitle: "#new drop / #bags / #office style", height: 180 },
      { title: "검색 도움말", subtitle: "태그와 단어를 섞어 보세요.", height: 180, y: 224 },
      { title: "지금 많이 보는 주제", subtitle: "커뮤니티 흐름을 짧게 보여줍니다.", height: 180, y: 424 },
    ],
  });

  const detail = await buildDetailFrame(servicePage, 0, 3040);

  const saved = await buildServiceFrame(servicePage, {
    name: "Service Shell / Saved",
    x: 0,
    y: 4900,
    width: 1440,
    height: 1400,
    topSubtitle: "저장한 글",
    speedLabel: "+ 3틱",
    heroEyebrow: "저장한 글",
    heroTitle: "다시 보고 싶은 글",
    heroSubtitle: "읽다 다시 보고 싶은 글을 모아둔 곳입니다.",
    quickActions: false,
    modeButtons: [
      { label: "저장", width: 110, active: true },
      { label: "최근 저장", width: 110 },
      { label: "댓글 많은 글", width: 126 },
    ],
    mainCards: [
      {
        title: "저장글 1",
        subtitle: "나중에 다시 보기 좋은 글",
        comments: 1,
        tags: ["#keep", "#later", "#context"],
      },
      {
        title: "저장글 2",
        subtitle: "관심이 이어지는 글",
        comments: 3,
        tags: ["#follow up", "#thread", "#reply"],
        y: 364,
      },
      {
        title: "저장글 3",
        subtitle: "다시 보고 싶은 대화가 있는 글",
        comments: 5,
        tags: ["#save later", "#discussion", "#discover"],
        y: 540,
      },
    ],
    sideCards: [
      { title: "저장글 사용 팁", subtitle: "저장한 글은 여기서 다시 볼 수 있습니다.", height: 180 },
      { title: "읽기 흐름", subtitle: "좋아요, 댓글, 공유는 원래 글에서 이어집니다.", height: 180, y: 224 },
      { title: "포럼으로 이동", subtitle: "저장글에서 다시 포럼으로 돌아갈 수 있습니다.", height: 180, y: 424 },
    ],
  });

  const adminPage = figma.createPage();
  adminPage.name = "Admin Shell";
  const admin = await buildAdminFrame(adminPage, 0, 0);

  figma.viewport.scrollAndZoomIntoView([home, discover, detail, saved, admin, componentsPage]);
  figma.closePlugin("Service shell frames created for Figma.");
}

main();
