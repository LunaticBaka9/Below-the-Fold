const products = {
  monstera: { name: '龟背竹', price: 129 },
  snake: { name: '虎尾兰', price: 89 },
  aloe: { name: '迷你芦荟', price: 59 },
};
const storageKey = 'verdant-bag';
const bag = new Map();
try {
  const savedBag = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
  for (const id of Object.keys(products)) {
    const quantity = savedBag?.[id];
    if (Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 99) {
      bag.set(id, quantity);
    }
  }
} catch {
  // Browsers can disable storage. The bag still works for the current visit.
}

const bagDialog = document.querySelector('.bag-dialog');
const bagCount = document.querySelector('.bag-count');
const bagItems = document.querySelector('.bag-items');
const bagTotal = document.querySelector('.bag-total');
const toast = document.querySelector('.toast');
let toastTimer;

function renderBag() {
  let count = 0;
  let total = 0;
  bagItems.replaceChildren();
  for (const [id, quantity] of bag) {
    const { name, price } = products[id];
    count += quantity;
    total += price * quantity;

    const row = document.createElement('div');
    row.className = 'bag-row';
    const label = document.createElement('span');
    label.textContent = name;
    const amount = document.createElement('span');
    amount.textContent = `× ${quantity}`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '移除一株';
    remove.setAttribute('aria-label', `移除一株${name}`);
    remove.addEventListener('click', () => {
      changeQuantity(id, -1);
      const remainingButtons = [...bagItems.querySelectorAll('button')];
      const replacement = remainingButtons.find(button => button.getAttribute('aria-label') === remove.getAttribute('aria-label'));
      (replacement ?? remainingButtons[0] ?? bagDialog.querySelector('button')).focus();
    });
    row.append(label, amount, remove);
    bagItems.append(row);
  }

  if (!count) bagItems.textContent = '购物袋还是空的。';
  bagCount.textContent = count;
  bagTotal.textContent = `小计 ¥${total}`;
}

function changeQuantity(id, change) {
  const current = bag.get(id) ?? 0;
  const next = Math.min(99, current + change);
  if (current === next) return false;
  if (next > 0) bag.set(id, next);
  else bag.delete(id);
  try {
    localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(bag)));
  } catch {
    // The in-memory state is already current.
  }
  renderBag();
  return true;
}

document.querySelectorAll('.add-product').forEach(button => {
  button.addEventListener('click', () => {
    const id = button.dataset.product;
    toast.textContent = changeQuantity(id, 1) ? `${products[id].name}已加入购物袋` : '这株植物已达到购物袋数量上限。';
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2100);
  });
});
document.querySelector('.bag-trigger').addEventListener('click', () => bagDialog.showModal());
renderBag();

const archive = document.querySelector('.archive');
const chamber = document.querySelector('.chamber');
const sceneClock = document.querySelector('.scene-clock');
const soundToggle = document.querySelector('.sound-toggle');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let frame;
let clockTimer;

function updateSceneClock() {
  clearInterval(clockTimer);
  sceneClock.textContent = '03:17:06';
  if (motion.matches || !chamber.classList.contains('is-active')) return;

  const started = performance.now();
  const timestamp = Date.UTC(2000, 0, 1, 3, 17, 6);
  clockTimer = setInterval(() => {
    sceneClock.textContent = new Date(timestamp + performance.now() - started).toISOString().slice(11, 19);
  }, 1000);
}

function applyScroll() {
  const viewport = window.innerHeight;
  const maxScroll = document.documentElement.scrollHeight - viewport;
  const archiveTop = archive.getBoundingClientRect().top;
  const chamberTop = chamber.getBoundingClientRect().top;
  document.documentElement.style.setProperty('--progress', maxScroll > 0 ? scrollY / maxScroll : 0);
  document.body.dataset.depth = chamberTop < viewport * 0.55 ? 'chamber' : archiveTop < viewport * 0.55 ? 'archive' : 'shop';

  const isInChamber = chamberTop < viewport * 0.62;
  archive.classList.toggle('is-active', archiveTop < viewport * 0.52);
  if (chamber.classList.contains('is-active') !== isInChamber) {
    chamber.classList.toggle('is-active', isInChamber);
    updateSceneClock();
  }
  if (chamberTop >= viewport) stopSound();
  frame = undefined;
}

function scheduleScroll() {
  if (frame === undefined) frame = requestAnimationFrame(applyScroll);
}
window.addEventListener('scroll', scheduleScroll, { passive: true });
window.addEventListener('resize', scheduleScroll);
motion.addEventListener('change', updateSceneClock);

let sound;
function stopSound() {
  if (!sound) return;
  const context = sound;
  sound = undefined;
  context.close().catch(() => {});
  updateSoundButton();
}

function updateSoundButton() {
  soundToggle.setAttribute('aria-pressed', String(Boolean(sound)));
  soundToggle.textContent = sound ? '关闭现场声音' : '开启现场声音';
}

soundToggle.addEventListener('click', async () => {
  if (sound) {
    stopSound();
    return;
  }

  const AudioEngine = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioEngine) {
    soundToggle.textContent = '此设备无法播放声音';
    soundToggle.disabled = true;
    return;
  }

  const context = new AudioEngine();
  sound = context;
  updateSoundButton();

  try {
    await context.resume();
    if (sound !== context) return;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.23, context.currentTime + 1.3);
    gain.connect(context.destination);

    for (const frequency of [43, 58.4]) {
      const drone = context.createOscillator();
      const level = context.createGain();
      drone.type = 'sine';
      drone.frequency.value = frequency;
      level.gain.value = 0.34;
      drone.connect(level).connect(gain);
      drone.start();
    }

    const buffer = context.createBuffer(1, context.sampleRate * 5, context.sampleRate);
    const samples = buffer.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < samples.length; i += 1) {
      previous = previous * 0.88 + (Math.random() * 2 - 1) * 0.12;
      samples[i] = previous * (0.42 - 0.4 * Math.cos(i / samples.length * Math.PI * 2));
    }
    const breath = context.createBufferSource();
    breath.buffer = buffer;
    breath.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 690;
    breath.connect(filter).connect(gain);
    breath.start();
  } catch {
    if (sound === context) {
      stopSound();
      soundToggle.textContent = '点按重试现场声音';
    }
  }
});

document.querySelector('.restart').addEventListener('click', stopSound);
window.addEventListener('pagehide', stopSound);
applyScroll();
