<template>
  <div ref="canvasContainer" class="gravity-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'

// --- 參數設定 ---
const WIDTH = 300
const BOUNDS = 2000 
const FORCE_MULTIPLIER = 2.0 

const canvasContainer = ref(null)

let scene, camera, renderer
let gpuCompute
let velocityVariable, positionVariable
let positionUniforms, velocityUniforms
let particleUniforms
let particleMesh
let animationId

let accumulatedTime = 0
let isPlaying = false

let audioContext, audioAnalyser, audioSource
let frequencyData
let checkTimer = null

let musicUniforms = {
  bass: { value: 0.0 },
  high: { value: 0.0 }
}

const gravitySpheres = []
const gravityPoints = [
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3()
]

// ============================================================================
// 1. GPGPU Shaders (物理)
// ============================================================================

const velocityFragmentShader = `
  uniform float time;
  uniform vec3 gravityPoints[3];
  uniform float uMusicBass; 

  void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec3 pos = texture2D( texturePosition, uv ).xyz;
      vec3 vel = texture2D( textureVelocity, uv ).xyz;

      vec3 acceleration = vec3( 0.0 );

      float baseForce = 6000.0;
      float musicForce = baseForce * (1.0 + uMusicBass * 3.0); 

      for ( int i = 0; i < 3; i++ ) {
          vec3 distVec = gravityPoints[i] - pos;
          float dist = length( distVec );
          
          float force = musicForce / ( dist * dist + 40.0 ); 
          
          vec3 dir = normalize( distVec );
          acceleration += dir * force;
      }

      vel += acceleration;

      vel *= 0.96;

      gl_FragColor = vec4( vel, 1.0 );
  }
`

const positionFragmentShader = `
  uniform float time;
  uniform float delta;

  void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec3 pos = texture2D( texturePosition, uv ).xyz;
      vec3 vel = texture2D( textureVelocity, uv ).xyz;

      pos += vel * delta;

      gl_FragColor = vec4( pos, 1.0 );
  }
`

// ============================================================================
// 2. Render Shaders (視覺)
// ============================================================================

const particleVertexShader = `
  uniform sampler2D texturePosition;
  uniform sampler2D textureVelocity;
  uniform float cameraConstant;
  uniform float time;
  uniform float uMusicHigh;
  
  varying vec4 vColor;

  vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
      vec4 posTemp = texture2D( texturePosition, uv );
      vec3 pos = posTemp.xyz;
      vec4 velTemp = texture2D( textureVelocity, uv );
      vec3 vel = velTemp.xyz;

      float speed = length( vel );
      float nSpeed = smoothstep(0.0, 20.0, speed); 
      float baseHue = mod(time * 0.05, 1.0);
      
      vec3 colorDark = hsv2rgb(vec3(baseHue + 0.6, 0.6, 0.4));
      vec3 colorLight = hsv2rgb(vec3(baseHue + 0.9, 0.5, 1.0));
      vec3 pinkHighlight = vec3(1.0, 0.4, 0.8); 
      
      colorLight = mix(colorLight, pinkHighlight, 0.1 + uMusicHigh * 0.3);

      vec3 finalColor = mix( colorDark, colorLight, nSpeed );

      vColor = vec4( finalColor, 1.0 );

      vec4 mvPosition = modelViewMatrix * vec4( pos, 1.0 );
      gl_Position = projectionMatrix * mvPosition;

      float sizePulse = 1.0 + uMusicHigh * 0.6;
      gl_PointSize = ( 1.4 * cameraConstant * sizePulse ) / - mvPosition.z;
  }
`

const particleFragmentShader = `
  varying vec4 vColor;
  uniform float uOpacity; 

  void main() {
      float f = length( gl_PointCoord - vec2( 0.5, 0.5 ) );
      if ( f > 0.5 ) discard;
      
      gl_FragColor = vec4(vColor.rgb, vColor.a * uOpacity * 0.6);
  }
`

// ============================================================================
// 3. 音頻與初始化
// ============================================================================

const initAudio = () => {
  checkTimer = setInterval(() => {
    const mediaElement = document.getElementById('global-audio-player') || document.querySelector('audio');
    if (mediaElement) {
      clearInterval(checkTimer);
      mediaElement.addEventListener('play', () => { isPlaying = true });
      mediaElement.addEventListener('pause', () => { isPlaying = false });
      isPlaying = !mediaElement.paused;
      if (!audioContext) setupAudioContext(mediaElement);
    }
  }, 1000);
}

const setupAudioContext = (mediaElement) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
    audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = 512;
    frequencyData = new Uint8Array(audioAnalyser.frequencyBinCount);
    audioSource = audioContext.createMediaElementSource(mediaElement);
    audioSource.connect(audioAnalyser);
    audioAnalyser.connect(audioContext.destination);
    const resumeCtx = () => { if (audioContext.state === 'suspended') audioContext.resume(); }
    document.addEventListener('click', resumeCtx, { once: true });
    mediaElement.addEventListener('play', resumeCtx);
  } catch (e) { console.error(e); }
}

const updateAudioData = () => {
  if (!audioAnalyser || !isPlaying) {
    musicUniforms.bass.value += (0 - musicUniforms.bass.value) * 0.05;
    musicUniforms.high.value += (0 - musicUniforms.high.value) * 0.05;
    return;
  }
  audioAnalyser.getByteFrequencyData(frequencyData);
  let bassSum = 0, highSum = 0;
  for (let i = 0; i < 5; i++) bassSum += frequencyData[i];
  for (let i = 100; i < 150; i++) highSum += frequencyData[i];
  
  const targetBass = (bassSum / 5 / 255.0) * FORCE_MULTIPLIER;
  const targetHigh = (highSum / 50 / 255.0) * FORCE_MULTIPLIER;

  musicUniforms.bass.value += (targetBass - musicUniforms.bass.value) * 0.1;
  musicUniforms.high.value += (targetHigh - musicUniforms.high.value) * 0.1;
}

const init = () => {
  const container = canvasContainer.value
  const width = window.innerWidth
  const height = window.innerHeight

  camera = new THREE.PerspectiveCamera( 75, width / height, 5, 15000 )
  camera.position.z = 1000 
  camera.position.y = 100

  scene = new THREE.Scene()
  scene.fog = new THREE.Fog( 0x000000, 1000, 4000 )

  renderer = new THREE.WebGLRenderer( { alpha: true, antialias: true } )
  renderer.setPixelRatio( window.devicePixelRatio )
  renderer.setSize( width, height )
  renderer.domElement.style.position = 'fixed'
  renderer.domElement.style.top = '0'
  renderer.domElement.style.left = '0'
  renderer.domElement.style.width = '100vw'
  renderer.domElement.style.height = '100vh'
  renderer.domElement.style.zIndex = '-1'
  container.appendChild( renderer.domElement )

  initComputeRenderer()
  initParticles()
  initGravityVisuals()
  initAudio()

  window.addEventListener( 'resize', onWindowResize )
  animate()
}

const initGravityVisuals = () => {
  const geometry = new THREE.SphereGeometry( 30, 32, 32 ); 
  const colors = [0xff0055, 0x00ffaa, 0x5500ff];
  for(let i=0; i<3; i++) {
    const material = new THREE.MeshBasicMaterial( { 
      color: colors[i], transparent: true, opacity: 0.9, depthTest: false, depthWrite: false 
    } );
    const sphere = new THREE.Mesh( geometry, material );
    sphere.renderOrder = 999; 
    sphere.add( new THREE.PointLight( colors[i], 10, 600 ) );
    scene.add( sphere );
    gravitySpheres.push( sphere );
  }
}

const initComputeRenderer = () => {
  gpuCompute = new GPUComputationRenderer( WIDTH, WIDTH, renderer )
  const dtPosition = gpuCompute.createTexture()
  const dtVelocity = gpuCompute.createTexture()
  fillTextures( dtPosition, dtVelocity )
  positionVariable = gpuCompute.addVariable( "texturePosition", positionFragmentShader, dtPosition )
  velocityVariable = gpuCompute.addVariable( "textureVelocity", velocityFragmentShader, dtVelocity )
  gpuCompute.setVariableDependencies( positionVariable, [ positionVariable, velocityVariable ] )
  gpuCompute.setVariableDependencies( velocityVariable, [ positionVariable, velocityVariable ] )
  
  positionUniforms = positionVariable.material.uniforms
  velocityUniforms = velocityVariable.material.uniforms
  positionUniforms[ "time" ] = { value: 0.0 }
  positionUniforms[ "delta" ] = { value: 0.0 }
  velocityUniforms[ "time" ] = { value: 1.0 }
  velocityUniforms[ "gravityPoints" ] = { value: gravityPoints }
  velocityUniforms[ "uMusicBass" ] = musicUniforms.bass;
  gpuCompute.init()
}

const fillTextures = ( texturePosition, textureVelocity ) => {
  const posArray = texturePosition.image.data
  const velArray = textureVelocity.image.data
  const aspect = window.innerWidth / window.innerHeight;
  const widthBounds = BOUNDS * Math.max(1, aspect);
  const heightBounds = BOUNDS * Math.max(1, 1/aspect); 
  const widthHalf = widthBounds / 2;
  const heightHalf = heightBounds / 2;
  const depthHalf = BOUNDS / 2;

  for ( let k = 0, kl = posArray.length; k < kl; k += 4 ) {
      posArray[ k + 0 ] = Math.random() * widthBounds - widthHalf
      posArray[ k + 1 ] = Math.random() * heightBounds - heightHalf
      posArray[ k + 2 ] = Math.random() * BOUNDS - depthHalf
      posArray[ k + 3 ] = 1

      velArray[ k + 0 ] = Math.random() * 0.2 - 0.1
      velArray[ k + 1 ] = Math.random() * 0.2 - 0.1
      velArray[ k + 2 ] = Math.random() * 0.2 - 0.1
      velArray[ k + 3 ] = 1
  }
}

const initParticles = () => {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array( WIDTH * WIDTH * 3 )
  const uvs = new Float32Array( WIDTH * WIDTH * 2 )
  let p = 0
  for ( let j = 0; j < WIDTH; j++ ) {
      for ( let i = 0; i < WIDTH; i++ ) {
          uvs[ p * 2 + 0 ] = i / ( WIDTH - 1 )
          uvs[ p * 2 + 1 ] = j / ( WIDTH - 1 )
          positions[ p * 3 + 0 ] = 0; positions[ p * 3 + 1 ] = 0; positions[ p * 3 + 2 ] = 0;
          p++;
      }
  }
  geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) )
  geometry.setAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ) )
  geometry.boundingSphere = new THREE.Sphere( new THREE.Vector3(), 10000 )

  particleUniforms = {
      "texturePosition": { value: null },
      "textureVelocity": { value: null },
      "cameraConstant": { value: getCameraConstant( camera ) },
      "time": { value: 0.0 },
      "uOpacity": { value: 0.0 },
      "uMusicHigh": musicUniforms.high 
  }
  const material = new THREE.ShaderMaterial( {
      uniforms: particleUniforms,
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  } )
  particleMesh = new THREE.Points( geometry, material )
  particleMesh.matrixAutoUpdate = false
  particleMesh.updateMatrix()
  scene.add( particleMesh )
}

function getCameraConstant( camera ) {
  return window.innerHeight / ( Math.tan( THREE.MathUtils.DEG2RAD * 0.5 * camera.fov ) / camera.zoom );
}

const onWindowResize = () => {
  if (!camera || !renderer) return
  const width = window.innerWidth
  const height = window.innerHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize( width, height )
  particleUniforms[ "cameraConstant" ].value = getCameraConstant( camera )
}

const animate = () => {
  animationId = requestAnimationFrame( animate )
  updateAudioData();

  const delta = 0.016;
  if (isPlaying) {
    accumulatedTime += delta * 1.5;
  } else {
    accumulatedTime += delta * 0.05;
  }

  let opacity = 0.0
  if (accumulatedTime > 0.5) opacity = Math.min((accumulatedTime - 0.5) / 2.0, 1.0)
  particleUniforms["uOpacity"].value = opacity
  particleUniforms["time"].value = accumulatedTime

  gravityPoints[0].set(Math.sin(accumulatedTime * 0.7) * 500, Math.cos(accumulatedTime * 0.5) * 400, Math.sin(accumulatedTime * 0.3) * 500)
  gravityPoints[1].set(Math.sin(accumulatedTime * 0.4 + 2.0) * 600, Math.cos(accumulatedTime * 0.6) * 500, Math.sin(accumulatedTime * 0.8) * 200)
  gravityPoints[2].set(Math.sin(accumulatedTime * 1.2) * 400, Math.cos(accumulatedTime * 0.9 + 1.0) * 400, Math.sin(accumulatedTime * 1.1) * 400)

  for(let i=0; i<3; i++) {
    if(gravitySpheres[i]) {
      gravitySpheres[i].position.copy(gravityPoints[i])
      const hue = (accumulatedTime * 0.1 + i * 0.3) % 1.0;
      const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
      gravitySpheres[i].material.color.copy(color);
      gravitySpheres[i].children[0].color.copy(color);
      gravitySpheres[i].scale.setScalar(1.0);
      gravitySpheres[i].children[0].intensity = 10 + (isPlaying ? musicUniforms.bass.value * 40 : 0);
    }
  }

  velocityUniforms[ "gravityPoints" ].value = gravityPoints
  positionUniforms[ "time" ].value = accumulatedTime
  positionUniforms[ "delta" ].value = 1.0 / 3.0

  gpuCompute.compute()
  particleUniforms[ "texturePosition" ].value = gpuCompute.getCurrentRenderTarget( positionVariable ).texture
  particleUniforms[ "textureVelocity" ].value = gpuCompute.getCurrentRenderTarget( velocityVariable ).texture
  renderer.render( scene, camera )
}

onMounted(() => { init() })
onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  if (animationId) cancelAnimationFrame(animationId)
  if (checkTimer) clearInterval(checkTimer)
  if (audioContext) audioContext.close();
  if (renderer) { renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove() }
})
</script>

<style scoped>
.gravity-container { display: block; pointer-events: none; }
</style>