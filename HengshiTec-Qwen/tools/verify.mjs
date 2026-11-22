// 无头浏览器验证：真实滚动驱动各阶段 + 终局序列 + 逃离重置
// 用法：node tools/verify.mjs   （依赖本机 google-chrome-stable，无需 npm 包）
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const URL_BASE = "file://" + path.join(ROOT, "index.html");
const PORT = 9333;
const OUT = path.join(ROOT, "previews");
mkdirSync(OUT, { recursive: true });

const chrome = spawn("google-chrome-stable", [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--disable-extensions", "--mute-audio", "--hide-scrollbars",
  `--user-data-dir=${path.join(ROOT, ".chrome-tmp")}`,
  `--remote-debugging-port=${PORT}`, "--window-size=1440,900", URL_BASE,
], { stdio: "ignore" });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };

async function getTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find(t => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch {}
    await sleep(300);
  }
  throw new Error("chrome target not found");
}

const target = await getTarget();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let msgId = 0;
const pending = new Map();
const errors = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || "unknown");
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map(a => a.value ?? a.description).join(" "));
};
const send = (method, params = {}) => new Promise(res => { const id = ++msgId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error("eval failed: " + JSON.stringify(r.result.exceptionDetails));
  return r.result?.result?.value;
};
const shot = async name => {
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(path.join(OUT, name), Buffer.from(r.result.data, "base64"));
};
const scrollToP = async p => {
  await evaluate(`window.scrollTo(0, ${p} * (document.documentElement.scrollHeight - innerHeight))`);
};
const state = () => evaluate(`JSON.stringify({
  stage: document.body.dataset.stage,
  dread: getComputedStyle(document.documentElement).getPropertyValue('--dread').trim(),
  title: document.title,
  finaleOn: document.getElementById('finale').classList.contains('on'),
  faceOn: document.getElementById('finaleFaceWrap').classList.contains('on'),
  lines: document.querySelectorAll('#finaleText .line').length,
  hudOn: document.getElementById('finaleHud').classList.contains('on'),
  exitOn: document.getElementById('finaleExit').classList.contains('on'),
  scrollY: Math.round(scrollY),
  h1: document.querySelector('.hero h1').textContent,
  seen: sessionStorage.getItem('ew_seen')
})`).then(JSON.parse);
const waitReady = async () => {
  for (let i = 0; i < 60; i++) {
    if (await evaluate("document.readyState") === "complete") return;
    await sleep(200);
  }
};

await send("Page.enable");
await send("Runtime.enable");
await waitReady();
await sleep(900);

// ---- 阶段 0：正常营销站 ----
let s = await state();
check("stage0 正常", s.stage === "0" && s.title.includes("守护你的家"), `title=${s.title}`);
await shot("01-stage0-normal.png");

// ---- 真实滚动逐阶段 ----
const expect = [
  [0.20, "1", "02-stage1-subtle.png"],
  [0.40, "2", "03-stage2-uncanny.png"],
  [0.60, "3", "04-stage3-broken.png"],
  [0.79, "4", "05-stage4-glitch.png"],
];
for (const [p, want, file] of expect) {
  await scrollToP(p);
  await sleep(1500);
  s = await state();
  check(`滚动 ${p} → stage ${want}`, s.stage === want, `stage=${s.stage} dread=${s.dread} title=${s.title}`);
  await shot(file);
}

// ---- 终局：走廊 → 黑屏 → 脸 ----
await scrollToP(0.96);
await sleep(3200);
s = await state();
check("终局触发（走廊阶段）", s.finaleOn && s.stage === "5", `finaleOn=${s.finaleOn}`);
await shot("06-finale-hallway.png");

for (let i = 0; i < 40; i++) { s = await state(); if (s.faceOn && s.lines >= 4 && s.exitOn) break; await sleep(700); }
check("终局脸部 + 四行文案 + 逃离按钮", s.faceOn && s.lines >= 4 && s.hudOn && s.exitOn, `lines=${s.lines} hud=${s.hudOn} exit=${s.exitOn}`);
check("终局标记已持久化", s.seen === "1");
await shot("07-finale-face.png");

// ---- 上滑：终局中止，但污染残留 ----
await scrollToP(0.30);
await sleep(1600);
s = await state();
check("上滑中止终局 + 污染下限 stage2", !s.finaleOn && s.stage === "2", `stage=${s.stage} dread=${s.dread}`);
await shot("08-tainted-return.png");

// ---- 逃离：重置回正常 ----
await scrollToP(0.96);
await sleep(1800);
await evaluate(`document.getElementById('finaleExit').click()`);
for (let i = 0; i < 30; i++) { await sleep(400); s = await state(); if (s.stage === "0" && s.scrollY === 0) break; }
check("逃离后重置为正常站", s.stage === "0" && s.scrollY === 0 && s.seen === null, `stage=${s.stage} scrollY=${s.scrollY}`);

// ---- 锁定预览：终局脸部特写 ----
await send("Page.navigate", { url: URL_BASE + "?stage=5&phase=face" });
await waitReady();
await sleep(3400);
s = await state();
check("?stage=5&phase=face 预览模式", s.faceOn && s.lines === 4, `lines=${s.lines}`);
await shot("09-finale-face-closeup.png");

check("无 JS 运行时错误", errors.length === 0, errors.slice(0, 3).join(" | "));

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
ws.close();
chrome.kill();
process.exit(failed.length ? 1 : 0);