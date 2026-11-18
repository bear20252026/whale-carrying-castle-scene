# Aetheria

A full-screen, interactive sky world made with React, TypeScript, Three.js, and Vite.

## Run

```sh
npm install
npm run dev
```

`npm run build` creates the production application in `dist/`. `npx tsc --noEmit` runs strict type checking. `npx playwright test` runs the browser tests; install Chromium with `npx playwright install --with-deps chromium` first.

## The Scene

This is a composed, image-based WebGL environment, not a fully modeled 360-degree scene. Generated artwork is projected onto a tessellated depth-relief surface. Independent cloud layers, weighted vertex deformation, instanced petals, and birds add restrained motion. The Ferris wheel is actual 3D geometry, with merged steel trusses and instanced gondolas that stay upright as the rotor moves. All four camera presets share the same scene and lighting.

The artwork preserves detailed masonry and whale skin without replacing them with simplistic primitives. Its lighting and fine material detail are baked into the image, not calculated as a full real-time subsurface-scattering or volumetric raymarching simulation. The constrained camera movement is intentional.

## Controls

- Drag to pan. Scroll or pinch to zoom.
- Choose any of the four perspectives in the bottom navigation.
- Press `1` through `4`, or the left/right arrows, to change perspective.
- Press `Space` to pause the scene, `H` to hide the interface, and `F` for fullscreen.
- Press `Escape` to return to the interface or close a dialog.
- Start the guided tour for a new perspective every 12 seconds.
- Save a clean PNG of the current rendered scene with the download control.

Ambient sound is locally synthesized with the Web Audio API and only starts after user interaction. Reduced-motion preferences are respected. Quality, motion, blossoms, volume, and zoom are adjustable in settings. No accounts, API keys, or external services are needed at runtime; all fonts and artwork are served locally.

## Key Files

- `src/App.tsx`: responsive interface and experience controls.
- `src/scene/DreamWorld.ts`: renderer, depth scene, camera movement, and lifecycle cleanup.
- `src/scene/ferrisWheel.ts`: modeled, batched, animated wheel.
- `src/scene/shaders.ts`: relief motion and sky shaders.
- `src/hooks/useAmbientAudio.ts`: procedural ambient audio.
- `tools/prepare_assets.py`: offline preparation of the image layers from `artwork/`; needs Pillow and NumPy. Prepared WebP assets are already included.
- `tests/experience.spec.ts`: desktop, mobile, export, sound, tour, and accessibility checks.