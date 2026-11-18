import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowLeft, ArrowRight, Check, ChevronDown, Download, Eye, EyeOff, Maximize, Minimize, Minus, MousePointer2, Pause, Play, Plus, RotateCcw, Settings2, Volume2, VolumeX, X } from 'lucide-react';
import { World, type WorldHandle } from './components/World';
import { useAmbientAudio } from './hooks/useAmbientAudio';
import { getInitialView, views, type RenderQuality, type ViewIndex } from './scene/views';

function WhaleMark({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 54 36" fill="none" aria-hidden="true">
      <path d="M11 16C19 10 31 10 40 15c4 2 7 5 9 5-2 7-10 11-19 9-9-1-16-7-19-13Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
      <path d="M12 17C7 17 3 12 3 7c5 1 8 3 10 6 0-5 3-8 8-9 0 6-3 11-9 13ZM25 23c1 4 5 7 10 8l-3-7M39 23c4 1 6 0 9-2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="40" cy="19" r=".9" fill="currentColor" />
      <path d="m37 2 1.2 3.4L42 7l-3.8 1.3L37 12l-1.3-3.7L32 7l3.7-1.6L37 2Z" fill="currentColor" />
    </svg>
  );
}

function Modal({ open, onClose, labelledBy, className = '', children }: {
  open: boolean; onClose: () => void; labelledBy: string; className?: string; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    else if (!open && ref.current?.open) ref.current?.close();
  }, [open]);
  return (
    <dialog ref={ref} className={`dialog ${className}`} aria-labelledby={labelledBy} onCancel={onClose} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="dialog-content">
        <button className="dialog-close icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} strokeWidth={1.5} /></button>
        {children}
      </div>
    </dialog>
  );
}

function SettingSwitch({ enabled, onChange, label, description }: {
  enabled: boolean; onChange: () => void; label: string; description: string;
}) {
  return <div className="setting-row"><div><p className="setting-label">{label}</p><p className="setting-description">{description}</p></div><button className={`switch ${enabled ? 'switch-on' : ''}`} role="switch" aria-checked={enabled} aria-label={label} onClick={onChange}><span /></button></div>;
}

export default function App() {
  const reducedMotion = useReducedMotion();
  const [activeView, setActiveView] = useState<ViewIndex>(getInitialView);
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [petals, setPetals] = useState(true);
  const [quality, setQuality] = useState<RenderQuality>('balanced');
  const [status, setStatus] = useState<'loading' | 'ready' | 'preview'>('loading');
  const [touring, setTouring] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [toast, setToast] = useState('');
  const [behindTheDream, setBehindTheDream] = useState(false);
  const world = useRef<WorldHandle>(null);
  const audio = useAmbientAudio();
  const view = views[activeView];

  const chooseView = useCallback((index: ViewIndex, manual = true) => {
    setActiveView(index);
    if (manual) setTouring(false);
    world.current?.reset();
  }, []);

  useEffect(() => { window.history.replaceState(null, '', `#${views[activeView].id}`); }, [activeView]);
  useEffect(() => {
    const handleHash = () => chooseView(getInitialView());
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [chooseView]);
  useEffect(() => {
    if (!touring || paused || storyOpen || settingsOpen) return;
    const timer = window.setTimeout(() => chooseView(((activeView + 1) % 4) as ViewIndex, false), 12000);
    return () => window.clearTimeout(timer);
  }, [touring, paused, activeView, storyOpen, settingsOpen, chooseView]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else setImmersive((current) => !current);
    } catch { setImmersive((current) => !current); }
  }, []);
  useEffect(() => {
    const listener = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', listener);
    return () => document.removeEventListener('fullscreenchange', listener);
  }, []);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setImmersive(false); return; }
      if (storyOpen || settingsOpen) return;
      const target = event.target as HTMLElement;
      if (target.closest('input, select, textarea, button, a, [contenteditable]')) return;
      if (/^[1-4]$/.test(event.key)) chooseView((Number(event.key) - 1) as ViewIndex);
      else if (event.key === 'ArrowRight') chooseView(((activeView + 1) % 4) as ViewIndex);
      else if (event.key === 'ArrowLeft') chooseView(((activeView + 3) % 4) as ViewIndex);
      else if (event.key === ' ') { event.preventDefault(); setPaused((value) => !value); }
      else if (event.key.toLowerCase() === 'h') setImmersive((value) => !value);
      else if (event.key.toLowerCase() === 'f') void toggleFullscreen();
      else if (event.key === '+' || event.key === '=') world.current?.zoom(1.12);
      else if (event.key === '-') world.current?.zoom(0.9);
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [activeView, chooseView, settingsOpen, storyOpen, toggleFullscreen]);

  const capture = () => {
    try {
      const image = world.current?.capture();
      if (!image) {
        setToast(status === 'preview' ? 'Captures need WebGL. Try a browser with hardware acceleration.' : 'The clouds are still gathering. Try again in a moment.');
        return;
      }
      const link = document.createElement('a');
      link.href = image;
      link.download = `aetheria-${view.id}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setToast('A little piece of Aetheria, saved for you.');
    } catch { setToast('This moment could not be saved. Please try again.'); }
  };
  const beginTour = () => {
    setStoryOpen(false);
    setTouring(true);
    setPaused(false);
    chooseView(0, false);
  };

  return (
    <main className={`experience ${immersive ? 'is-immersive' : ''} ${activeView !== 0 ? 'is-detail' : ''}`}>
      <World ref={world} view={activeView} paused={paused || storyOpen || settingsOpen} petals={petals} quality={quality} onStatus={setStatus} />
      <div className="world-shade" aria-hidden="true" /><div className="footer-mist" aria-hidden="true" />
      <AnimatePresence>
        {!immersive && (
          <motion.div className="interface" key="interface" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0.1 : 0.5 }}>
            <motion.header className="topbar" initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.9, delay: 0.15 }}>
              <button className="brand" onClick={() => chooseView(0)} aria-label="Aetheria, return to the panorama"><WhaleMark className="brand-mark" /><span>AETHERIA</span></button>
              <nav className="header-links" aria-label="Experience controls">
                <button className="story-link" onClick={() => setStoryOpen(true)}>About this world <span className="story-link-dot" /></button>
                <span className="header-divider" aria-hidden="true" />
                <button className={`sound-button ${audio.enabled ? 'sound-on' : ''}`} onClick={() => void audio.toggle()} aria-pressed={audio.enabled} aria-label={audio.enabled ? 'Turn ambient sound off' : 'Turn ambient sound on'}><span className="sound-bars" aria-hidden="true"><i /><i /><i /><i /><i /></span><span>Sound {audio.enabled ? 'on' : 'off'}</span></button>
                <button className="settings-button" onClick={() => setSettingsOpen(true)} aria-label="Open experience settings" title="Make yourself at home"><Settings2 size={17} strokeWidth={1.5} /></button>
              </nav>
            </motion.header>
            <div className={`hero-copy-position ${activeView !== 0 ? 'detail-copy-position' : ''}`}>
              <AnimatePresence mode="wait">
                <motion.section key={view.id} className={`hero-copy ${activeView === 0 ? 'panorama-copy' : 'detail-copy'}`} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: reducedMotion ? 0.1 : 0.65 }} aria-labelledby="world-title">
                  <p className="eyebrow"><span />{view.eyebrow}</p><h1 id="world-title">{view.title}</h1>
                  <p className="hero-subtitle">{view.subtitle}</p><p className="hero-description">{view.description}</p>
                  <button className="explore-button" onClick={() => chooseView(((activeView + 1) % 4) as ViewIndex)}>{['Explore this world', 'Find a new perspective', 'Meet our gentle giant', 'Back to the panorama'][activeView]}{activeView === 3 ? <ArrowLeft size={16} strokeWidth={1.5} /> : <ArrowRight size={16} strokeWidth={1.5} />}</button>
                </motion.section>
              </AnimatePresence>
            </div>
            <motion.footer className="bottom-bar" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.9, delay: 0.45 }}>
              <div className="wander-hint"><MousePointer2 size={19} strokeWidth={1.3} /><div><span>{status === 'loading' ? 'Gathering the clouds...' : 'Drag to wander'}</span><p>{status === 'preview' ? 'Illustrated preview' : <><span className="desktop-hint">Scroll to get a little closer</span><span className="touch-hint">Pinch to get a little closer</span></>}</p></div></div>
              <div className="view-navigation">
                <p className="navigation-eyebrow">{touring ? 'A LITTLE GUIDED DAYDREAM' : 'A CHANGE OF PERSPECTIVE'}</p>
                <nav className="view-selector" aria-label="Choose a camera view">
                  {views.map((item, index) => (
                    <button key={item.id} className={`view-button ${activeView === index ? 'view-active' : ''}`} aria-pressed={activeView === index} aria-label={`View ${index + 1}: ${item.name}`} onClick={() => chooseView(index as ViewIndex)}>
                      <span className="view-number">0{index + 1}</span><span className="view-name">{item.shortName}</span>
                      {touring && activeView === index && <span className="tour-progress" key={`${index}-${paused}`} style={{ animationPlayState: paused || storyOpen || settingsOpen ? 'paused' : 'running' }} />}
                    </button>
                  ))}
                  <span className="tour-divider" /><button className={`tour-button ${touring ? 'tour-is-playing' : ''}`} aria-label={touring ? 'Stop guided tour' : 'Start guided tour'} aria-pressed={touring} title={touring ? 'Stop guided tour' : 'Take a slow guided tour'} onClick={() => { setTouring((value) => !value); if (!touring) setPaused(false); }}>{touring ? <Pause size={13} strokeWidth={1.5} /> : <Play size={13} strokeWidth={1.5} />}</button>
                </nav>
              </div>
              <div className="view-tools">
                <button className="tool-button" onClick={capture} aria-label="Save this moment as an image" title="Save this moment"><Download size={17} strokeWidth={1.4} /></button>
                <button className="tool-button hide-interface-button" onClick={() => setImmersive(true)} aria-label="Hide interface" title="Just the view (H)"><EyeOff size={17} strokeWidth={1.4} /></button>
                <button className="tool-button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title="A little more sky (F)">{fullscreen ? <Minimize size={16} strokeWidth={1.5} /> : <Maximize size={16} strokeWidth={1.5} />}</button>
              </div>
            </motion.footer>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {immersive && <motion.button className="return-button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setImmersive(false)}><Eye size={15} />Return to Aetheria <kbd>ESC</kbd></motion.button>}
        {paused && !immersive && !storyOpen && !settingsOpen && <motion.button className="motion-paused" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPaused(false)}><Play size={11} />Let the world move</motion.button>}
        {toast && <motion.div className="toast" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}><Check size={15} />{toast}</motion.div>}
      </AnimatePresence>
      <Modal open={storyOpen} onClose={() => setStoryOpen(false)} labelledBy="story-title" className="story-dialog">
        <WhaleMark className="story-whale" /><p className="panel-eyebrow">A NOTE FROM AETHERIA</p><h2 id="story-title">Not every journey<br />needs a destination.</h2>
        <p className="story-intro">Somewhere between the sky and a daydream, there is a place that moves a little more slowly.</p>
        <p className="story-body">A wandering whale. A castle full of quiet stories. Cherry blossoms that never quite reach the ground. Aetheria is a small invitation to step away from the everyday and simply be somewhere wonderful.</p>
        <p className="story-pause">Take the long way around.<br />Let the world wait.</p>
        <button className="panel-primary" onClick={beginTour}>Take the scenic route <ArrowRight size={17} /></button>
        <div className="behind-the-dream"><button aria-expanded={behindTheDream} onClick={() => setBehindTheDream((value) => !value)}>Behind the dream <ChevronDown size={14} className={behindTheDream ? 'rotated' : ''} /></button>{behindTheDream && <p>An image-based world, rendered in real time with Three.js. A sculpted depth surface preserves the artwork, while an independently modeled Ferris wheel, moving cloud layers, and drifting petals bring it to life. All four perspectives share the same scene. This is a composed dreamscape, not an unrestricted 3D model.</p>}</div>
        <span className="story-signature">A LITTLE ESCAPE, JUST FOR YOU.</span>
      </Modal>
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} labelledBy="settings-title" className="settings-dialog">
        <p className="panel-eyebrow">YOUR LITTLE CORNER OF THE SKY</p><h2 id="settings-title">Make yourself at home.</h2><p className="panel-description">A few things, just the way you like them.</p>
        <div className="settings-list">
          <SettingSwitch enabled={!paused} onChange={() => setPaused((value) => !value)} label="Let the world move" description="Whale, clouds, and the sky wheel" />
          <SettingSwitch enabled={petals} onChange={() => setPetals((value) => !value)} label="Drifting blossoms" description="A little pink in the breeze" />
          <div className="setting-row quality-row"><label className="setting-label" htmlFor="render-quality">Rendering detail</label><select id="render-quality" value={quality} onChange={(event) => setQuality(event.target.value as RenderQuality)}><option value="balanced">Balanced</option><option value="high">High detail</option><option value="gentle">Gentle on your device</option></select></div>
          <div className="volume-setting"><div className="setting-row"><span className="setting-label">Sounds of the sky</span><button className="small-text-button" onClick={() => void audio.toggle()}>{audio.enabled ? <Volume2 size={15} /> : <VolumeX size={15} />}{audio.enabled ? 'Sound on' : 'Sound off'}</button></div><input aria-label="Ambient sound volume" type="range" min="0" max="1" step="0.05" value={audio.volume} onChange={(event) => audio.setVolume(Number(event.target.value))} /></div>
        </div>
        <div className="settings-camera"><span className="setting-label">A little closer?</span><div><button className="icon-button" aria-label="Zoom out" onClick={() => world.current?.zoom(0.9)}><Minus size={17} /></button><button className="icon-button" aria-label="Zoom in" onClick={() => world.current?.zoom(1.12)}><Plus size={17} /></button><button className="reset-button" onClick={() => { world.current?.reset(); setToast('Back to your perfect point of view.'); }}><RotateCcw size={14} />Reset view</button></div></div>
        <div className="keyboard-hints"><span><kbd>1</kbd> <span>to</span> <kbd>4</kbd> Change view</span><span><kbd>SPACE</kbd> Pause</span><span><kbd>H</kbd> Just the view</span></div>
        <p className="render-note">{status === 'preview' ? 'WebGL is unavailable. You are viewing the illustrated preview.' : 'Rendered in your browser. A little wonder, a lighter footprint.'}</p>
      </Modal>
      <span className="sr-only" role="status" aria-live="polite">{`Current perspective: ${view.name}. ${touring ? 'Guided tour is playing.' : ''}`}</span>
      <a className="skip-to-views" href="#camera-controls" onClick={(event) => { event.preventDefault(); document.querySelector<HTMLButtonElement>('.view-button')?.focus(); }}>Skip to camera controls <ArrowDown size={14} /></a>
    </main>
  );
}
