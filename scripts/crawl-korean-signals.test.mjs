import test from "node:test";
import assert from "node:assert/strict";

import {
  extractHtmlAnchors,
  extractMusinsaRankingApiUrl,
  extractMusinsaRankingItems,
  selectBalancedRecords,
} from "./crawl-korean-signals.mjs";

test("extractHtmlAnchors pulls Korean headline anchors with matching hrefs", () => {
  const html = `
    <div>
      <a href="https://n.news.naver.com/mnews/ranking/article/022/0004118256?ntype=RANKING">
        옥주현 "안 먹는 다이어트는 고속 노화”…주당 0.45kg 감량이 핵심 [라이프+]
      </a>
      <a href="/ignore">short</a>
    </div>
  `;

  const anchors = extractHtmlAnchors(html, {
    minLength: 18,
    hrefPattern: /\/mnews\/|ranking\/article/i,
    requireKorean: true,
  });

  assert.equal(anchors.length, 1);
  assert.match(anchors[0].href, /naver\.com/);
  assert.match(anchors[0].text, /옥주현/);
});

test("extractMusinsaRankingApiUrl reads ranking API URL from next data script", () => {
  const html = `
    <script id="__NEXT_DATA__" type="application/json">
      {"props":{"pageProps":{"data":{"store":[{"pan":[{"type":"ranking","webApi":"https://api.musinsa.com/api2/hm/web/v5/pans/ranking?storeCode=musinsa&subPan=product"}]}]}}}}
    </script>
  `;

  const apiUrl = extractMusinsaRankingApiUrl(html);
  assert.equal(apiUrl, "https://api.musinsa.com/api2/hm/web/v5/pans/ranking?storeCode=musinsa&subPan=product");
});

test("extractMusinsaRankingItems pulls product ranking entries", () => {
  const payload = {
    data: {
      modules: [
        {
          type: "MULTICOLUMN",
          items: [
            {
              type: "PRODUCT_COLUMN",
              id: "6015024",
              info: {
                brandName: "크록스",
                productName: "에코 시티 어드벤쳐 클로그 - 카키 / 213115-260",
                finalPrice: 119000,
                discountRatio: 0,
                onClickBrandName: { url: "https://www.musinsa.com/brand/crocs" },
              },
              image: {
                rank: 1,
                labels: [{ text: "급상승" }],
              },
            },
          ],
        },
      ],
    },
  };

  const items = extractMusinsaRankingItems(payload);
  assert.equal(items.length, 1);
  assert.equal(items[0].brandName, "크록스");
  assert.equal(items[0].finalPrice, 119000);
  assert.deepEqual(items[0].labels, ["급상승"]);
  assert.equal(items[0].rank, 1);
});

test("selectBalancedRecords keeps later source platforms in the limited output", () => {
  const records = [
    { source: { platform: "google_trends" }, rawTitle: "a" },
    { source: { platform: "google_trends" }, rawTitle: "b" },
    { source: { platform: "google_trends" }, rawTitle: "c" },
    { source: { platform: "naver_news" }, rawTitle: "d" },
    { source: { platform: "hankyung" }, rawTitle: "e" },
    { source: { platform: "musinsa" }, rawTitle: "f" },
  ];

  const selected = selectBalancedRecords(records, 4);
  const platforms = selected.map((record) => record.source.platform);

  assert.equal(selected.length, 4);
  assert.ok(platforms.includes("google_trends"));
  assert.ok(platforms.includes("naver_news"));
  assert.ok(platforms.includes("hankyung"));
  assert.ok(platforms.includes("musinsa"));
});
