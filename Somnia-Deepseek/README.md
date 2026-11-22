# Somnia — 一个会变质的营销网站

一个虚构睡眠科技品牌 **Somnia** 的官网。第一屏看起来完全正常：字体、留白、产品 UI、媒体报道墙、定价表，全是标准的 DTC 落地页。然后你继续往下滚。

页面会慢慢开始注意你。

---

## 分幕

| 幕 | 位置 | 发生什么 |
| --- | --- | --- |
| **01 正常** | Hero → Features | 干净的营销网站。首屏写着「Sleep is the last unoptimized part of your day.」 |
| **02 裂缝** | Press → Reviews | 媒体报道墙里有一个 logo 叫 **You**；第三张功能卡写着「知道房间什么时候是空的——以及什么时候不是」；第三条评价是「我不记得自己醒来」。 |
| **03 倾听** | Science → Pricing | 整站转暗。一扇门在滚动中慢慢打开，门里有个东西；定价表第三档叫 **You**，状态是「Already enrolled」。 |
| **04 转向** | FAQ → Session | 页面开始用第二人称说话，显示你的**真实本地时间、屏幕分辨率、在页时长、鼠标移动距离**。名字来自你填的邮箱。 |
| **05 假结局** | End | 「You've reached the end. There's nothing below this.」停在这里 3 秒，它会改口：**「It's still below you.」** |
| **06 房间** | Void → Final | 页面被拉长 8 屏。黑暗里出现一张脸：眼睛睁开、瞳孔跟着鼠标、会眨眼、嘴越张越大。最后一切归于纯黑，只剩「Good night.」和一句「It will still be here.」 |

## 交互与彩蛋

- **邮箱 → 名字**：首屏的试用邮箱表单会从地址里提取名字，之后会出现在评价署名、Session 日志和结尾的「Good night, {name}.」里。
- **真实数据**：本地时钟、时区时间、`screen.width × screen.height`、在页时长、鼠标累计移动距离，全部是真的。
- **第二个光标**：进入第三幕后，会出现一个比你慢半拍的光标；到了最后一幕，它不再跟着你。
- **假结局**：必须真的在页底停住，页面才会把「下面什么都没有」改成「它还在下面」，然后向下生长。
- **语言彩蛋**：如果浏览器语言是中文，结尾会出现一句「它一直都在这里。」
- **声音**（默认关闭）：首次访问右下角会有一次「允许声音」询问，类似 cookie 弹窗。允许后是程序化生成的房间底噪、低频 drone、心跳、耳语；最后心跳会慢慢停下来。右上角 `SOUND` 可随时开关。
- **减少动态**：尊重 `prefers-reduced-motion`，会关闭抖动、光标拖尾和部分动画。

## 运行

静态站点，无构建步骤、无框架、无第三方运行时请求。建议用本地服务器（直接 `file://` 打开时字体和部分浏览器策略可能受限）：

```bash
cd /home/lunaticbaka/Works/Fun/deepseek
python3 -m http.server 4173 --bind 127.0.0.1
# 打开 http://127.0.0.1:4173/
```

## 文件

```
index.html          页面结构与全部文案
styles.css          视觉系统；四幕通过 html[data-act] 切换配色与排版
app.js              滚动引擎、幕次切换、实时数据、光标、结局触发、面部动画
audio.js            WebAudio 程序化音效（无采样文件）
assets/fonts/       Instrument Serif / Instrument Sans（自托管 woff2，OFL）
```

## 想改点什么

- **文案**：`index.html` 里直接改；三处会「变质」的文案在 `app.js` 的 `SWAPS` 表里。
- **节奏**：`styles.css` 中 `.void.is-open` 的 `520vh` 决定黑暗长廊的长度；`app.js` 里 `armEnding()` 的 `2300ms` 是假结局等待时间。
- **吓人程度**：`styles.css` 的 `.face-wrap` 滤镜、`app.js` 的 `reveal / open / close` 阈值，以及 `.mouth` 的 `scaleY(3.4)`。
- **配色**：`:root` 与 `html[data-act="1..4"]` 里的 CSS 变量。

## 提示

这是一个恐怖体验：包含突然出现的面孔、低频音效和跳动的心脏声。默认静音，声音需要你主动允许。没有频闪；有 `prefers-reduced-motion` 降级。如果你不想被吓到，关掉声音、滚到底部之前离开即可。
