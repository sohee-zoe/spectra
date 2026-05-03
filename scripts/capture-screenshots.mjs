import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";

const PORT = 4174;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const STORAGE_KEY = "spectra.requirements.v1";
const THEME_KEY = "spectra.theme";

const now = "2026-05-03T00:00:00.000Z";

const demoProject = {
  project: {
    id: "demo-project",
    name: "쇼핑몰 MVP",
    version: "1.0.0",
    updatedAt: now,
  },
  items: [
    {
      id: "ur-checkout",
      type: "UR",
      index: 1,
      content: "고객은 이메일과 비밀번호로 쇼핑몰에 로그인할 수 있다.",
      tags: ["login", "mvp"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "ur-security",
      type: "UR",
      index: 2,
      content: "고객은 관심 상품을 장바구니에 담고 수량을 변경할 수 있다.",
      tags: ["cart", "mvp"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "ur-refund",
      type: "UR",
      index: 3,
      content: "고객은 장바구니 상품을 주문서로 전환해 결제를 시작할 수 있다.",
      tags: ["order", "checkout"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "sr-api",
      type: "SR",
      index: 1,
      name: "로그인 인증 API",
      priority: "R",
      protocol: "REST",
      dataFormat: "JSON",
      payload: "{ email, password } -> { accessToken, userId }",
      content: "이메일과 비밀번호를 검증하고 세션 토큰을 발급한다.",
      tags: ["api", "login"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "sr-tokenization",
      type: "SR",
      index: 2,
      name: "장바구니 저장 모델",
      priority: "R",
      protocol: "REST",
      dataFormat: "JSON",
      payload: "{ productId, quantity, selectedOptions }",
      content: "사용자별 장바구니 항목과 수량 변경 이력을 저장한다.",
      tags: ["cart", "backend"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "sr-refund",
      type: "SR",
      index: 3,
      name: "주문서 생성 API",
      priority: "O",
      protocol: "REST",
      dataFormat: "JSON",
      payload: "{ cartId, shippingAddressId, couponCode }",
      content: "장바구니 금액, 배송지, 할인 정보를 검증해 주문서를 생성한다.",
      tags: ["order", "checkout"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "ft-checkout",
      type: "FEATURE",
      index: 1,
      content: "로그인 화면과 로그인 실패 메시지 표시.",
      tags: ["frontend", "login"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "ft-vault",
      type: "FEATURE",
      index: 2,
      content: "상품 상세 페이지의 장바구니 담기 버튼과 수량 조절 UI.",
      tags: ["frontend", "cart"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "ft-refund",
      type: "FEATURE",
      index: 3,
      content: "장바구니에서 주문서 생성 화면으로 이동하는 checkout CTA.",
      tags: ["frontend", "checkout"],
      createdAt: now,
      updatedAt: now,
    },
  ],
  links: [
    {
      id: "link-ur-checkout-sr-api",
      type: "UR_TO_SR",
      sourceId: "ur-checkout",
      targetId: "sr-api",
      createdAt: now,
    },
    {
      id: "link-ur-security-sr-tokenization",
      type: "UR_TO_SR",
      sourceId: "ur-security",
      targetId: "sr-tokenization",
      createdAt: now,
    },
    {
      id: "link-ur-refund-sr-refund",
      type: "UR_TO_SR",
      sourceId: "ur-refund",
      targetId: "sr-refund",
      createdAt: now,
    },
    {
      id: "link-sr-api-ft-checkout",
      type: "SR_TO_FEATURE",
      sourceId: "sr-api",
      targetId: "ft-checkout",
      createdAt: now,
    },
    {
      id: "link-sr-tokenization-ft-vault",
      type: "SR_TO_FEATURE",
      sourceId: "sr-tokenization",
      targetId: "ft-vault",
      createdAt: now,
    },
    {
      id: "link-sr-refund-ft-refund",
      type: "SR_TO_FEATURE",
      sourceId: "sr-refund",
      targetId: "ft-refund",
      createdAt: now,
    },
  ],
};

function startServer() {
  const child = spawn(
    "npm",
    ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(PORT)],
    {
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(BASE_URL);
      if (response.ok) return;
    } catch {
      // Server not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${BASE_URL}`);
}

async function main() {
  await mkdir("docs/assets", { recursive: true });

  const server = startServer();
  try {
    await waitForServer();

    const browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: 1680, height: 1050 },
      deviceScaleFactor: 1,
    });

    await page.addInitScript(
      ({ storageKey, themeKey, project }) => {
        window.localStorage.setItem(storageKey, JSON.stringify(project));
        window.localStorage.setItem(themeKey, "dark");
      },
      {
        storageKey: STORAGE_KEY,
        themeKey: THEME_KEY,
        project: demoProject,
      }
    );

    await page.goto(BASE_URL);
    await page.getByText("로그인 인증 API").waitFor();
    await page.locator('[data-item-id="sr-api"]').click();
    await page.screenshot({
      path: "docs/assets/spectra-board.png",
      fullPage: false,
    });

    await page.getByRole("button", { name: "Toggle view mode" }).click();
    await page.getByText("로그인 인증 API").waitFor();
    await page.screenshot({
      path: "docs/assets/spectra-graph.png",
      fullPage: false,
    });

    await browser.close();
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
