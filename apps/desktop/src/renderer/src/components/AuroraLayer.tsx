import { useEffect, useRef, type JSX } from 'react';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uPointer;
  uniform vec2 uResolution;

  float hash(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), local.x), mix(hash(cell + vec2(0.0, 1.0)), hash(cell + 1.0), local.x), local.y);
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 field = vec2(uv.x * aspect, uv.y);
    float drift = uTime * 0.035;
    float wave = sin(field.x * 3.2 + drift * 2.0) * 0.08 + noise(vec2(field.x * 1.25 + drift, drift)) * 0.2;
    float ribbonA = exp(-pow(abs(uv.y - (0.64 + wave)), 1.45) * 25.0);
    float ribbonB = exp(-pow(abs(uv.y - (0.38 - wave * 0.72)), 1.5) * 34.0);
    float veil = noise(field * vec2(2.2, 3.8) + vec2(drift, -drift)) * 0.32;
    float pointerGlow = exp(-distance(uv, uPointer) * 5.5) * 0.16;
    vec3 cyan = vec3(0.0, 0.78, 1.0);
    vec3 green = vec3(0.38, 1.0, 0.28);
    vec3 violet = vec3(0.56, 0.18, 1.0);
    vec3 color = mix(cyan, green, smoothstep(0.05, 0.92, uv.x)) * ribbonA;
    color += mix(violet, cyan, uv.x) * ribbonB * 0.7;
    color += mix(violet, green, uv.y) * veil * (ribbonA + ribbonB) * 0.55;
    color += cyan * pointerGlow;
    float alpha = clamp((ribbonA + ribbonB) * 0.19 + pointerGlow, 0.0, 0.28);
    gl_FragColor = vec4(color, alpha);
  }
`;

export default function AuroraLayer(): JSX.Element {
  const host = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = host.current;
    if (!container) return undefined;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' }); }
    catch { container.dataset.fallback = 'true'; return undefined; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.4));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0.72, 0.32) },
      uResolution: { value: new THREE.Vector2(1, 1) }
    };
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const geometry = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geometry, material));
    const clock = new THREE.Clock();
    let frame = 0;
    const resize = (): void => {
      const width = Math.max(1, container.clientWidth); const height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false); uniforms.uResolution.value.set(width, height);
    };
    const pointer = (event: PointerEvent): void => { uniforms.uPointer.value.set(event.clientX / Math.max(1, window.innerWidth), 1 - event.clientY / Math.max(1, window.innerHeight)); };
    const render = (): void => {
      uniforms.uTime.value = clock.getElapsedTime(); renderer.render(scene, camera);
      if (!reducedMotion && !document.hidden) frame = window.requestAnimationFrame(render);
    };
    const visibility = (): void => { if (!document.hidden && !reducedMotion && !frame) render(); else if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; } };
    resize(); render();
    window.addEventListener('resize', resize); window.addEventListener('pointermove', pointer, { passive: true }); document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelAnimationFrame(frame); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', pointer); document.removeEventListener('visibilitychange', visibility);
      geometry.dispose(); material.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className="aurora-layer" aria-hidden="true" />;
}
