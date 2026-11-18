export const worldVertexShader = /* glsl */ `
  uniform sampler2D uDepth;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 p = position;
    float depth = texture2D(uDepth, uv).r;
    p.z += depth * 0.44;
    float tail = (1.0 - smoothstep(0.13, 0.35, uv.x))
      * (1.0 - smoothstep(0.64, 0.8, uv.y));
    float fin = exp(-dot((uv - vec2(0.44, 0.11)) / vec2(0.14, 0.19),
      (uv - vec2(0.44, 0.11)) / vec2(0.14, 0.19)) * 2.0);
    p.y += sin(uTime * 0.5 + uv.x * 2.0) * 0.052 * tail;
    p.z += sin(uTime * 0.5 + 0.6) * 0.11 * tail;
    p.y += sin(uTime * 0.5 - 0.4) * 0.035 * fin;
    p.z += sin(uTime * 0.5 - 0.4) * 0.09 * fin;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

export const worldFragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(uMap, vUv);
    if (color.a < 0.015) discard;
    gl_FragColor = color;
    #include <colorspace_fragment>
  }
`;

export const skyVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.999, 1.0);
  }
`;

export const skyFragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uAspect;
  uniform float uTime;
  uniform vec2 uPointer;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    float imageAspect = 1.7777778;
    if (uAspect > imageAspect) {
      uv.y = (uv.y - 0.5) * imageAspect / uAspect + 0.5;
    } else {
      uv.x = (uv.x - 0.5) * uAspect / imageAspect + 0.5;
    }
    uv = (uv - 0.5) * 0.96 + 0.5;
    uv += uPointer * 0.003;
    uv.x += sin(uTime * 0.025) * 0.004;
    vec4 color = texture2D(uMap, uv);
    color.rgb *= vec3(0.74, 0.86, 0.97);
    gl_FragColor = color;
    #include <colorspace_fragment>
  }
`;