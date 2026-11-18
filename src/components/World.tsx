import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { DreamWorld, type WorldOptions } from '../scene/DreamWorld';
import { views } from '../scene/views';

export interface WorldHandle {
  capture: () => string | undefined;
  reset: () => void;
  zoom: (amount: number) => void;
}

interface Props extends WorldOptions {
  onStatus: (status: 'ready' | 'preview') => void;
}

export const World = forwardRef<WorldHandle, Props>(function World(props, ref) {
  const mount = useRef<HTMLDivElement>(null);
  const engine = useRef<DreamWorld | null>(null);
  const latestProps = useRef(props);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState(false);
  latestProps.current = props;

  useImperativeHandle(ref, () => ({
    capture: () => engine.current?.capture(),
    reset: () => engine.current?.reset(),
    zoom: (amount) => engine.current?.zoomBy(amount),
  }), []);

  useEffect(() => {
    if (!mount.current) return;
    let alive = true;
    try {
      engine.current = new DreamWorld(mount.current, latestProps.current, () => {
        if (!alive) return;
        setReady(true);
        latestProps.current.onStatus('ready');
      }, () => {
        if (!alive) return;
        setPreview(true);
        setReady(false);
        latestProps.current.onStatus('preview');
      });
    } catch {
      setPreview(true);
      latestProps.current.onStatus('preview');
    }
    return () => {
      alive = false;
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    engine.current?.setOptions(props);
  }, [props.view, props.paused, props.petals, props.quality]);

  const view = views[props.view];
  return (
    <div className="world" aria-label="Aetheria interactive dreamscape">
      <div className={`world-preview ${ready ? 'world-preview-hidden' : ''}`} aria-hidden="true">
        <div className="preview-sky" />
        <img
          src="/images/world-fallback.webp"
          alt=""
          className="preview-subject"
          style={preview && props.view !== 0 ? {
            transform: `translate(-50%, -50%) scale(${view.zoom})`,
            transformOrigin: `${view.focus[0] * 100}% ${(1 - view.focus[1]) * 100}%`,
          } : undefined}
        />
      </div>
      <div ref={mount} className={`webgl-mount ${ready ? 'is-ready' : ''}`} />
    </div>
  );
});