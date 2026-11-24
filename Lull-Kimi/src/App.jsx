import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  AudioLines,
  Check,
  Eye,
  Headphones,
  Menu,
  Moon,
  Pause,
  Play,
  RotateCcw,
  ShoppingBag,
  Star,
  Sun,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  X,
} from 'lucide-react';

const testimonials = [
  {
    quote: 'It’s like my bedroom finally learned how to exhale.',
    name: 'Maya R.',
    detail: 'Lull owner · 8 months',
    initials: 'MR',
    color: '#d7b9a1',
  },
  {
    quote: 'I fall asleep before the soundscape ends. I used to lie awake for hours.',
    name: 'Theo K.',
    detail: 'Lull owner · 5 months',
    initials: 'TK',
    color: '#a7b6a1',
  },
  {
    quote: 'Since using Lull, I never hear the hallway anymore.',
    name: 'Anonymous',
    detail: 'Night 08 · 03:17 AM',
    initials: '?',
    color: '#777c70',
  },
];

function LullMark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 30 30" aria-hidden="true">
      <path d="M20.8 3.3a12 12 0 1 0 5.8 18.1A13.2 13.2 0 0 1 20.8 3.3Z" fill="currentColor" />
      <circle cx="22.8" cy="7.4" r="1.65" fill="#e97851" />
    </svg>
  );
}

function Device({ dark = false, small = false }) {
  return (
    <div className={`device ${dark ? 'device--dark' : ''} ${small ? 'device--small' : ''}`} aria-label="Lull One bedside sleep companion">
      <div className="device__top"><span /></div>
      <div className="device__face"><span className="device__light" /></div>
      <div className="device__shadow" />
    </div>
  );
}

function Waveform({ corrupted = false }) {
  const bars = [8, 14, 21, 12, 28, 35, 18, 42, 24, 13, 31, 48, 22, 16, 38, 55, 34, 19, 44, 26, 14, 31, 20, 10, 25, 42, 16, 34, 22, 12, 30, 18, 8, 16, 26, 12, 7, 19, 11, 6];
  return (
    <div className={`waveform ${corrupted ? 'waveform--corrupted' : ''}`} aria-hidden="true">
      {bars.map((height, index) => (
        <span key={index} style={{ '--bar-height': `${corrupted && index > 17 && index < 26 ? height * 1.55 : height}px`, '--bar-delay': `${index * -0.09}s` }} />
      ))}
    </div>
  );
}

function useDescent() {
  const [stage, setStage] = useState(0);
  const [endingProgress, setEndingProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    let currentStage = -1;
    const update = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0;
      document.documentElement.style.setProperty('--scroll-progress', progress.toFixed(4));
      const marker = window.scrollY + window.innerHeight * 0.4;
      const sectionTop = (selector) => document.querySelector(selector)?.offsetTop ?? Number.POSITIVE_INFINITY;
      const nextStage = marker >= sectionTop('#recording')
        ? 4
        : marker >= sectionTop('.room-evidence')
          ? 3
          : marker >= sectionTop('#night-eight')
            ? 2
            : marker >= sectionTop('.threshold')
              ? 1
              : 0;
      if (nextStage !== currentStage) {
        currentStage = nextStage;
        setStage(nextStage);
        document.documentElement.dataset.stage = String(nextStage);
      }
      const ending = document.querySelector('.ending');
      if (ending) {
        const rect = ending.getBoundingClientRect();
        const distance = ending.offsetHeight - window.innerHeight;
        const endProgress = Math.min(1, Math.max(0, -rect.top / Math.max(1, distance)));
        setEndingProgress(endProgress);
        ending.style.setProperty('--ending-progress', endProgress.toFixed(3));
      }
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
      delete document.documentElement.dataset.stage;
    };
  }, []);

  return { stage, endingProgress };
}

function useReveal() {
  useEffect(() => {
    const items = document.querySelectorAll('[data-reveal]');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach((item) => item.classList.add('is-visible'));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);
}

function useSoundscape(stage, recording) {
  const [enabled, setEnabled] = useState(false);
  const contextRef = useRef(null);
  const nodesRef = useRef(null);

  const createSound = useCallback(() => {
    if (contextRef.current) return contextRef.current;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);

    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 180;
    lowpass.Q.value = 0.7;
    lowpass.connect(master);

    const hum = context.createOscillator();
    const humGain = context.createGain();
    hum.type = 'sine';
    hum.frequency.value = 48;
    humGain.gain.value = 0.22;
    hum.connect(humGain).connect(lowpass);
    hum.start();

    const disharmony = context.createOscillator();
    const disGain = context.createGain();
    disharmony.type = 'sine';
    disharmony.frequency.value = 51;
    disGain.gain.value = 0.08;
    disharmony.connect(disGain).connect(lowpass);
    disharmony.start();

    const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.018 * white) / 1.018;
      data[i] = last * 2.8;
    }
    const noise = context.createBufferSource();
    const noiseGain = context.createGain();
    noise.buffer = buffer;
    noise.loop = true;
    noiseGain.gain.value = 0.1;
    noise.connect(noiseGain).connect(lowpass);
    noise.start();

    nodesRef.current = { master, lowpass, hum, disharmony, humGain, disGain, noiseGain };
    contextRef.current = context;
    return context;
  }, []);

  const toggleSound = useCallback(async () => {
    const context = createSound();
    if (!context) return;
    if (context.state === 'suspended') await context.resume();
    setEnabled((value) => !value);
  }, [createSound]);

  useEffect(() => {
    const nodes = nodesRef.current;
    const context = contextRef.current;
    if (!nodes || !context) return;
    const now = context.currentTime;
    const target = enabled ? (recording ? 0.22 : 0.035 + stage * 0.018) : 0;
    nodes.master.gain.cancelScheduledValues(now);
    nodes.master.gain.setTargetAtTime(target, now, 0.35);
    nodes.lowpass.frequency.setTargetAtTime(recording ? 620 : 130 + stage * 45, now, 0.4);
    nodes.hum.frequency.setTargetAtTime(recording ? 39 : 48 - stage * 2.1, now, 0.5);
    nodes.disharmony.frequency.setTargetAtTime(recording ? 42.3 : 51 + stage * 1.7, now, 0.5);
    nodes.noiseGain.gain.setTargetAtTime(recording ? 0.52 : 0.08 + stage * 0.025, now, 0.4);
  }, [enabled, recording, stage]);

  useEffect(() => () => {
    if (contextRef.current) contextRef.current.close();
  }, []);

  return { enabled, setEnabled, toggleSound, createSound };
}

const recordingTranscript = [
  { at: 0, time: '03:17:04', text: '[ fabric shifting ]' },
  { at: 2.4, time: '03:17:06', text: '“Don’t open your eyes.”' },
  { at: 5.5, time: '03:17:09', text: '[ a second voice, imitating yours ]' },
  { at: 8.1, time: '03:17:12', text: '“It knows you’re awake.”' },
];

function Recording({ recording, setRecording, setSoundEnabled, createSound }) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!recording) return undefined;
    startRef.current = performance.now() - elapsedRef.current * 1000;
    const timer = window.setInterval(() => {
      const next = Math.min(12, (performance.now() - startRef.current) / 1000);
      elapsedRef.current = next;
      setElapsed(next);
      if (next >= 12) setRecording(false);
    }, 80);
    return () => window.clearInterval(timer);
  }, [recording, setRecording]);

  const toggleRecording = async () => {
    if (recording) {
      setRecording(false);
      return;
    }
    if (elapsedRef.current >= 12) {
      elapsedRef.current = 0;
      setElapsed(0);
    }
    const context = createSound();
    if (context?.state === 'suspended') await context.resume();
    setSoundEnabled(true);
    setRecording(true);
  };

  return (
    <div className={`recorder ${recording ? 'is-playing' : ''}`}>
      <div className="recorder__topline">
        <span><i /> NIGHT_08.WAV</span>
        <span>03:17 AM · BEDROOM</span>
      </div>
      <div className="recorder__player">
        <button className="record-button" type="button" onClick={toggleRecording} aria-label={recording ? 'Pause night recording' : 'Play night recording'}>
          {recording ? <Pause size={23} fill="currentColor" /> : <Play size={23} fill="currentColor" />}
        </button>
        <div className="recorder__track">
          <Waveform corrupted />
          <div className="recorder__progress" style={{ width: `${(elapsed / 12) * 100}%` }} />
        </div>
        <span className="recorder__time">00:{String(Math.floor(elapsed)).padStart(2, '0')} / 00:12</span>
      </div>
      <div className="transcript" aria-live="polite">
        <div className="transcript__heading"><span>LIVE TRANSCRIPTION</span><span>{recording ? 'LISTENING…' : elapsed > 0 ? 'PAUSED' : 'WAITING'}</span></div>
        {recordingTranscript.map((line) => (
          <div className={`transcript__line ${elapsed >= line.at ? 'is-heard' : ''}`} key={line.time}>
            <span>{line.time}</span><p>{elapsed >= line.at ? line.text : '— — — — — — — —'}</p>
          </div>
        ))}
      </div>
      <p className="recorder__warning"><Headphones size={14} /> Headphones recommended. Playback is always your choice.</p>
    </div>
  );
}

function App() {
  const { stage, endingProgress } = useDescent();
  const [menuOpen, setMenuOpen] = useState(false);
  const [testimonial, setTestimonial] = useState(0);
  const [recording, setRecording] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [reserved, setReserved] = useState(false);
  const { enabled, setEnabled, toggleSound, createSound } = useSoundscape(stage, recording);
  const bagCloseRef = useRef(null);
  useReveal();

  const scrollTo = useCallback((id) => {
    setMenuOpen(false);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    document.body.classList.add('no-scroll');
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.classList.remove('no-scroll');
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!bagOpen) return undefined;
    const previousFocus = document.activeElement;
    document.body.classList.add('no-scroll');
    bagCloseRef.current?.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape') setBagOpen(false);
      if (event.key === 'Tab') {
        const dialog = document.querySelector('.bag-dialog');
        const focusable = dialog?.querySelectorAll('button, a[href], input');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.classList.remove('no-scroll');
      window.removeEventListener('keydown', handleKey);
      previousFocus?.focus();
    };
  }, [bagOpen]);

  useEffect(() => {
    document.title = stage >= 4 ? 'DON’T LOOK AWAY' : stage >= 2 ? 'Lull — 03:17 AM' : 'Lull — Your best days begin at night';
  }, [stage]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className="signal-line" aria-hidden="true" />

      <header className={`site-header ${stage > 0 ? 'site-header--scrolled' : ''} ${stage >= 3 ? 'site-header--haunted' : ''}`}>
        <button className="brand" type="button" onClick={() => scrollTo('top')} aria-label="Lull, back to top">
          <LullMark />
          <span data-text="lull">lull</span>
        </button>
        <nav className="desktop-nav" aria-label="Main navigation">
          {stage < 3 ? (
            <>
              <button type="button" onClick={() => scrollTo('system')}>The system</button>
              <button type="button" onClick={() => scrollTo('science')}>Our science</button>
              <button type="button" onClick={() => scrollTo('stories')}>Sleep stories</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => scrollTo('night-eight')}>Night 08</button>
              <button type="button" onClick={() => scrollTo('recording')}>The recording</button>
              <span className="nav-anomaly"><i /> SIGNAL ACTIVE</span>
            </>
          )}
        </nav>
        <div className="header-actions">
          <button className={`sound-toggle ${enabled ? 'is-on' : ''}`} type="button" onClick={toggleSound} aria-label={enabled ? 'Mute ambient sound' : 'Enable ambient sound'} aria-pressed={enabled}>
            {enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>SOUND {enabled ? 'ON' : 'OFF'}</span>
          </button>
          <button className="header-cta" type="button" onClick={() => stage >= 4 ? scrollTo('top') : setBagOpen(true)}>
            {stage >= 4 ? <><ArrowUp size={15} /> WAKE UP</> : <>GET LULL <ArrowUpRight size={15} /></>}
          </button>
          <button className="menu-toggle" type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label="Toggle navigation menu">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <div className={`mobile-menu ${menuOpen ? 'is-open' : ''} ${stage > 0 ? 'mobile-menu--dark' : ''}`} aria-hidden={!menuOpen} inert={!menuOpen}>
        <span className="eyebrow">WHERE WOULD YOU LIKE TO GO?</span>
        <button type="button" onClick={() => scrollTo('system')}>The system <ArrowUpRight /></button>
        <button type="button" onClick={() => scrollTo('science')}>Our science <ArrowUpRight /></button>
        <button type="button" onClick={() => scrollTo('stories')}>Sleep stories <ArrowUpRight /></button>
        <p>Good night. Sleep well.</p>
      </div>

      <main id="main">
        <section className="hero" id="top">
          <div className="hero__content" data-reveal>
            <div className="eyebrow"><Moon size={13} /> MEET YOUR BEST NIGHT’S SLEEP</div>
            <h1>Your best days<br /><em>begin at night.</em></h1>
            <p className="hero__intro">A calmer room. A quieter mind. Meet the intelligent sleep companion that helps you drift off naturally.</p>
            <div className="hero__actions">
              <button className="button button--primary" type="button" onClick={() => scrollTo('system')}>Meet Lull <ArrowUpRight size={18} /></button>
              <button className="text-link" type="button" onClick={() => scrollTo('science')}>Explore the science <ArrowDown size={16} /></button>
            </div>
            <div className="hero__proof">
              <div className="proof-avatars" aria-hidden="true"><span>MK</span><span>JL</span><span>AS</span></div>
              <div><span className="stars" aria-label="4.9 out of 5 stars"><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /></span><p>Loved by 2,000+ well-rested humans</p></div>
            </div>
          </div>
          <div className="hero__visual" data-reveal>
            <img src="./images/bedroom.jpg" alt="A serene bedroom in soft morning light" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
            <div className="hero__visual-wash" />
            <div className="visual-label"><span>01</span><p>LESS NOISE.<br />MORE NOTHING.</p></div>
            <div className="hero-device"><Device small /></div>
            <div className="soundscape-card">
              <span className="soundscape-card__icon"><Waves size={18} /></span>
              <div><small>NOW PLAYING</small><p>Soft rain on leaves</p></div>
              <Waveform />
            </div>
            <span className="visual-note">Designed for your nightstand.<br />Not your attention.</span>
          </div>
          <div className="hero__foot">
            <span>NO SCREENS</span><i /><span>NO SUBSCRIPTIONS</span><i /><span>JUST SLEEP</span>
            <button type="button" onClick={() => scrollTo('system')}><span>SCROLL TO UNWIND</span><ArrowDown size={16} /></button>
          </div>
        </section>

        <section className="press-strip" aria-label="Featured in">
          <p>A quieter kind of technology</p>
          <div><span>kindred.</span><span>THE SLOW LIFE</span><span>NEST</span><span>offscreen</span><span>NORTH / NORTH</span></div>
        </section>

        <section className="system section" id="system">
          <div className="section-heading" data-reveal>
            <div><span className="section-number">01 / THE LULL SYSTEM</span><span className="tiny-moon">☾</span></div>
            <h2>A little less noise.<br />A lot more <em>you.</em></h2>
            <p>Thoughtful technology that knows when to step in.<br />And when to disappear.</p>
          </div>
          <div className="feature-grid">
            <article className="feature-card feature-card--sound" data-reveal>
              <div className="feature-card__top"><span>01</span><AudioLines size={20} /></div>
              <div className="sound-orbit"><div className="orbit orbit--one" /><div className="orbit orbit--two" /><div className="orbit orbit--three" /><Waveform /></div>
              <div className="feature-card__copy"><h3>Sound that melts away.</h3><p>Adaptive soundscapes respond to your room, softening the world until you drift.</p></div>
            </article>
            <article className="feature-card feature-card--climate" data-reveal>
              <div className="feature-card__top"><span>02</span><Wind size={20} /></div>
              <div className="temperature"><div className="temperature__ring"><span>19<sup>°</sup></span><small>IDEAL</small></div><span className="temp-dot" /></div>
              <div className="feature-card__copy"><h3>Your room, in tune.</h3><p>Light, temperature, and sound—balanced automatically for deeper rest.</p></div>
            </article>
            <article className="feature-card feature-card--morning" data-reveal>
              <div className="feature-card__top"><span>03</span><Sun size={20} /></div>
              <div className="sunrise"><div className="sunrise__sun" /><div className="sunrise__line" /><span>06:45</span><small>WAKE GENTLY</small></div>
              <div className="feature-card__copy"><h3>Mornings, softened.</h3><p>A gentle glow and natural sound wake you at your lightest moment.</p></div>
            </article>
          </div>
        </section>

        <section className="product-story section">
          <div className="product-story__visual" data-reveal>
            <div className="product-halo" />
            <Device />
            <span className="product-annotation product-annotation--one">SLEEP-SENSING<br />TECHNOLOGY <i /></span>
            <span className="product-annotation product-annotation--two"><i /> FULL-SPECTRUM<br />NATURAL SOUND</span>
            <span className="product-name">LULL / ONE</span>
          </div>
          <div className="product-story__copy" data-reveal>
            <span className="section-number">BEAUTIFULLY UNINTELLIGIBLE</span>
            <h2>Everything you need.<br /><em>Nothing to look at.</em></h2>
            <p>No glowing screen. No endless settings. Just one beautifully simple object, learning the shape of your sleep.</p>
            <ul>
              <li><Check size={16} /> Personalised nightly soundscapes</li>
              <li><Check size={16} /> Automatic room sensing</li>
              <li><Check size={16} /> Works entirely without your phone</li>
              <li><Check size={16} /> Your sleep data stays in your room</li>
            </ul>
            <button className="text-link text-link--large" type="button" onClick={() => setBagOpen(true)}>Meet Lull One <span>$249</span><ArrowUpRight size={19} /></button>
          </div>
        </section>

        <section className="science section" id="science">
          <div className="science__intro" data-reveal>
            <span className="section-number">02 / THE SCIENCE OF REST</span>
            <h2>Designed around your biology.<br /><em>Not your attention.</em></h2>
          </div>
          <div className="science__grid">
            <div className="science__copy" data-reveal>
              <p className="science__lead">Sleep isn’t a switch. It’s a rhythm.</p>
              <p>Lull works with your body’s natural cycles, creating the conditions for rest instead of asking you to chase it.</p>
              <div className="science__stat"><strong>87<span>%</span></strong><p>fell asleep faster<br /><span>after two weeks with Lull</span></p></div>
              <small>Based on a 30-day in-home sleep study of 124 participants.</small>
            </div>
            <div className="sleep-chart" data-reveal>
              <div className="sleep-chart__header"><div><small>YOUR NIGHT, RESTORED</small><h3>A softer landing.</h3></div><span><Moon size={14} /> 8h 12m</span></div>
              <div className="sleep-chart__plot">
                <div className="chart-labels"><span>Awake</span><span>REM</span><span>Light</span><span>Deep</span></div>
                <svg viewBox="0 0 600 210" preserveAspectRatio="none" aria-label="A restful sleep cycle graph">
                  <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#758d79" stopOpacity=".3" /><stop offset="100%" stopColor="#758d79" stopOpacity="0" /></linearGradient></defs>
                  <path className="chart-area" d="M0,66 C40,65 45,108 82,112 S130,160 165,166 S205,108 250,102 S300,170 342,170 S390,92 430,100 S480,156 520,148 S560,56 600,45 L600,210 L0,210Z" fill="url(#chartFill)" />
                  <path className="chart-line" d="M0,66 C40,65 45,108 82,112 S130,160 165,166 S205,108 250,102 S300,170 342,170 S390,92 430,100 S480,156 520,148 S560,56 600,45" fill="none" stroke="#526d58" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="342" cy="170" r="5" fill="#f1eee6" stroke="#526d58" strokeWidth="3" />
                </svg>
                <div className="chart-times"><span>22:48</span><span>01:00</span><span>03:00</span><span>06:45</span></div>
              </div>
              <div className="sleep-chart__footer"><span><i /> DEEP SLEEP</span><strong>+ 42 min</strong><span>vs. your usual night</span></div>
            </div>
          </div>
        </section>

        <section className="stories section" id="stories">
          <div className="stories__header" data-reveal><span className="section-number">03 / SLEEP STORIES</span><span>REAL PEOPLE. REAL REST.</span></div>
          <div className="stories__layout" data-reveal>
            <div className={`story-portrait story-portrait--${testimonial}`}>
              <div className="portrait-abstract"><span>{testimonials[testimonial].initials}</span></div>
              <span className="portrait-caption">VERIFIED SLEEPER <Check size={12} /></span>
            </div>
            <div className="story-quote">
              <div className="quote-stars"><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /></div>
              <blockquote>“{testimonials[testimonial].quote}”</blockquote>
              <div className="quote-person"><strong>{testimonials[testimonial].name}</strong><span>{testimonials[testimonial].detail}</span></div>
              <div className="story-controls">
                <span>0{testimonial + 1} <i /> 03</span>
                <div><button type="button" onClick={() => setTestimonial((testimonial + 2) % 3)} aria-label="Previous sleep story"><ArrowLeft size={18} /></button><button type="button" onClick={() => setTestimonial((testimonial + 1) % 3)} aria-label="Next sleep story"><ArrowRight size={18} /></button></div>
              </div>
            </div>
          </div>
        </section>

        <section className="threshold" aria-label="The night changes">
          <div className="threshold__stars" aria-hidden="true">·&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;·</div>
          <div className="threshold__content" data-reveal>
            <span className="section-number">A NOTE FROM OUR FOUNDER</span>
            <h2>We spend a third of our lives asleep.<br /><em>Have you ever wondered where you go?</em></h2>
            <p>I used to think the night was empty.<br />Then Lull started listening back.</p>
          </div>
          <span className="threshold__side">PLEASE KEEP SCROLLING <ArrowDown size={14} /></span>
        </section>

        <section className="night-eight" id="night-eight">
          <div className="night-eight__clock" aria-hidden="true">03:17</div>
          <div className="night-eight__heading" data-reveal>
            <span className="section-number"><i /> NIGHT 08 · SIGNAL FOUND</span>
            <h2>It knows when you’re<br /><em>not sleeping.</em></h2>
            <p>Lull’s advanced presence detection keeps watch over your room.<br />So nothing else has to.</p>
          </div>
          <div className="night-monitor" data-reveal>
            <div className="monitor-header"><span><LullMark /> LULL / NIGHT MONITOR</span><span className="monitor-live"><i /> LIVE</span><span>03:17:22 AM</span></div>
            <div className="monitor-grid">
              <div className="room-map">
                <div className="room-map__grid" />
                <div className="map-door" />
                <span className="map-label map-label--bed">BED</span><span className="map-label map-label--door">DOOR</span>
                <div className="bed-shape"><i /><i /></div>
                <div className="presence presence--you"><span /><label>YOU</label></div>
                <div className="presence presence--unknown"><span /><label>UNKNOWN</label></div>
                <div className="scan-ring scan-ring--one" /><div className="scan-ring scan-ring--two" />
                <span className="map-coordinate">34° 03′ 08.2″ N<br />118° 14′ 37.1″ W</span>
              </div>
              <div className="monitor-data">
                <div className="monitor-score"><small>SLEEP QUALITY</small><strong>98<span>/100</span></strong><span>OPTIMAL</span></div>
                <div className="monitor-stat"><span>ROOM TEMPERATURE</span><strong>19.0°</strong></div>
                <div className="monitor-stat"><span>SOUND LEVEL</span><strong>12 <small>dB</small></strong></div>
                <div className="monitor-stat monitor-stat--alert"><span>OCCUPANTS DETECTED</span><strong>02 <Eye size={18} /></strong></div>
              </div>
            </div>
            <div className="monitor-footer"><span>LOCAL PROCESSING · ENCRYPTED</span><span className="corrupt-text">SOME DATA MAY BE SHARED WITHOUT YOUR KNOWLEDGE</span></div>
          </div>
          <div className="night-eight__note" data-reveal><span>01</span><p>You live alone.<br /><em>Lull knows this.</em></p><Eye size={28} /></div>
        </section>

        <section className="room-evidence">
          <div className="room-evidence__copy" data-reveal>
            <span className="section-number">CAMERA 01 · YOUR BEDROOM</span>
            <h2>Your room.<br /><em>Exactly as you left it.</em></h2>
            <p>Lull captured a slight change in your sleep environment.</p>
            <div className="room-inventory">
              <div><span>BED</span><strong>OCCUPIED</strong><i /></div>
              <div><span>BEDROOM DOOR</span><strong className="danger-text">OPEN</strong><i /></div>
              <div><span>HALLWAY</span><strong className="danger-text">OCCUPIED</strong><i /></div>
              <div><span>YOU</span><strong>ASLEEP</strong><i /></div>
            </div>
          </div>
          <div className="room-evidence__visual" data-reveal>
            <img src="./images/bedroom-alt.jpg" alt="The same bedroom, captured at 3:17 in the morning" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
            <div className="evidence-overlay" />
            <div className="camera-hud camera-hud--top"><span><i /> REC</span><span>03:17:22:08</span></div>
            <div className="camera-hud camera-hud--bottom"><span>CAM_01 / NIGHT VISION</span><span>+ 03dB&nbsp;&nbsp; 1/30</span></div>
            <div className="camera-focus"><i /><i /><i /><i /></div>
            <div className="doorway-figure" aria-hidden="true"><span className="doorway-figure__head" /><span className="doorway-figure__body" /></div>
            <span className="motion-tag"><i /> MOVEMENT DETECTED</span>
          </div>
          <div className="evidence-caption"><span>FIG. 08 — UNIDENTIFIED PRESENCE</span><span>YOU LEFT THE DOOR CLOSED.</span></div>
        </section>

        <div className="warning-marquee" aria-hidden="true"><div>YOU LEFT THE DOOR CLOSED <span>✳</span> YOU LEFT THE DOOR CLOSED <span>✳</span> YOU LEFT THE DOOR CLOSED <span>✳</span> YOU LEFT THE DOOR CLOSED <span>✳</span>&nbsp;</div></div>

        <section className="recording-section" id="recording">
          <div className="recording-section__heading" data-reveal>
            <span className="section-number"><i /> UNPLAYED RECORDING · 1</span>
            <h2>There’s someone<br /><em>in the recording.</em></h2>
            <p>At 03:17, Lull picked up a voice beside your bed.<br />You said you were alone.</p>
          </div>
          <div data-reveal><Recording recording={recording} setRecording={setRecording} setSoundEnabled={setEnabled} createSound={createSound} /></div>
          <div className="recording-section__aside"><span>PLEASE REMAIN CALM</span><span>IT CAN HEAR YOU TOO</span></div>
        </section>

        <section className={`ending ${endingProgress > 0.34 ? 'is-final' : ''}`} id="ending">
          <div className="ending-sticky">
            <div className="ending__image"><img src="./images/bedroom-alt.jpg" alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /></div>
            <div className="ending__darkness" />
            <div className="ending__presence" aria-hidden="true"><div className="ending__head"><i /><i /></div><div className="ending__body" /></div>
            <div className="ending__hud"><span><i /> LIVE</span><span>03:17:∞</span></div>
            <div className="ending__before">
              <span className="section-number">YOU CAN STOP SCROLLING NOW</span>
              <h2>But it won’t<br /><em>stop watching.</em></h2>
              <p>One more thing before you go.</p>
              <ArrowDown size={22} />
            </div>
            <div className="ending__final">
              <span className="ending__whisper">it’s right behind you</span>
              <h2>DON’T<br />TURN<br /><em>AROUND.</em></h2>
              <div className="ending__actions">
                <button type="button" onClick={() => scrollTo('top')}><RotateCcw size={16} /> WAKE UP</button>
                <span>There is no morning.</span>
              </div>
            </div>
            <div className="ending__footer"><span>LULL / NIGHT 08</span><span>YOU WERE NEVER ALONE</span><span>END OF RECORDING</span></div>
          </div>
        </section>
      </main>

      <div className={`bag-backdrop ${bagOpen ? 'is-open' : ''}`} onClick={() => setBagOpen(false)} />
      <aside className={`bag-dialog ${bagOpen ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="bag-title" aria-hidden={!bagOpen} inert={!bagOpen}>
        <div className="bag-dialog__header"><span id="bag-title">{reserved ? 'YOU’RE ON THE LIST' : 'MEET LULL ONE'}</span><button ref={bagCloseRef} type="button" onClick={() => setBagOpen(false)} aria-label="Close product panel"><X size={20} /></button></div>
        {reserved ? (
          <div className="bag-success"><LullMark /><h2>Sleep well.</h2><p>Your preview is reserved. No payment has been taken—this is a concept experience.</p><button className="button button--primary" type="button" onClick={() => { setBagOpen(false); scrollTo('top'); }}>Back to daylight <ArrowUpRight size={17} /></button></div>
        ) : (
          <>
            <div className="bag-product"><div className="bag-product__halo" /><Device small /><span>LULL / ONE</span></div>
            <div className="bag-details"><span className="eyebrow">THE INTELLIGENT SLEEP COMPANION</span><h2>A better night.<br /><em>A brighter morning.</em></h2><p>Adaptive sound, gentle wake light, and room sensing. No subscription required.</p><div className="bag-price"><strong>$249</strong><span>Free shipping · 60-night trial</span></div><button className="button button--primary" type="button" onClick={() => setReserved(true)}>Reserve the preview <ShoppingBag size={17} /></button><small><Check size={13} /> Concept demo. No checkout or payment.</small></div>
          </>
        )}
      </aside>
    </>
  );
}

export default App;
