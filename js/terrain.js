// ==================== 地形系统（Simplex Noise + 自定义 shader 混合纹理）====================
const Terrain = (() => {
  const WORLD_SIZE = 2000;
  const SEGMENTS = 256;
  const MAX_ELEVATION = 100;
  const WATER_LEVEL = 10;
  const VILLAGE_RADIUS = 80;

  const BIOMES = {
    PLAINS: { name: '青耳原野', cx: 0.5, cy: 0.5 },
    DESERT: { name: '赤沙雅丹', cx: 0.92, cy: 0.5 },
    SNOW:   { name: '寒渊雪原', cx: 0.5, cy: 0.08 },
    FOREST: { name: '幽暗古林', cx: 0.08, cy: 0.5 },
    LAVA:   { name: '熔岩裂谷', cx: 0.5, cy: 0.92 },
  };

  const PEAKS = [
    { x: 0,    z: -900, height: 260, radius: 220, steepness: 0.55 },
    { x: -200, z: -800, height: 200, radius: 160, steepness: 0.5 },
    { x: 200,  z: -820, height: 210, radius: 170, steepness: 0.5 },
    { x: 0,    z: 900,  height: 240, radius: 200, steepness: 0.6 },
    { x: 750,  z: 0,    height: 150, radius: 180, steepness: 0.45 },
    { x: -700, z: -200, height: 160, radius: 180, steepness: 0.45 },
    { x: -600, z: 200,  height: 130, radius: 150, steepness: 0.45 },
  ];

  const RIVER_PATH = [
    [-900, 40], [-600, -20], [-300, 30],
    [0, 0], [250, -30], [500, 20],
    [750, -10], [950, 40]
  ];

  function biomeWeights(x, z) {
    const nx = (x + WORLD_SIZE / 2) / WORLD_SIZE;
    const nz = (z + WORLD_SIZE / 2) / WORLD_SIZE;
    const weights = {};
    let total = 0;
    for (const [key, b] of Object.entries(BIOMES)) {
      const dx = nx - b.cx;
      const dz = nz - b.cy;
      const d = Math.sqrt(dx * dx + dz * dz);
      const w = Math.pow(1 / (d + 0.06), 2.8);
      weights[key] = w;
      total += w;
    }
    const result = {};
    for (const k of Object.keys(weights)) {
      result[k] = weights[k] / total;
    }
    return result;
  }

  function riverDistance(x, z) {
    let minDist = Infinity;
    for (let i = 0; i < RIVER_PATH.length - 1; i++) {
      const [x1, z1] = RIVER_PATH[i];
      const [x2, z2] = RIVER_PATH[i + 1];
      const dx = x2 - x1;
      const dz = z2 - z1;
      const lenSq = dx * dx + dz * dz;
      let t = ((x - x1) * dx + (z - z1) * dz) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const px = x1 + t * dx;
      const pz = z1 + t * dz;
      const d = Math.sqrt((x - px) ** 2 + (z - pz) ** 2);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  const HEIGHT_CACHE_SIZE = 512;
  const HEIGHT_CELL = 4;
  const heightCache = new Float32Array(HEIGHT_CACHE_SIZE * HEIGHT_CACHE_SIZE);
  const heightCacheValid = new Uint8Array(HEIGHT_CACHE_SIZE * HEIGHT_CACHE_SIZE);

  function getHeightCached(x, z) {
    const cx = Math.floor(x / HEIGHT_CELL + HEIGHT_CACHE_SIZE / 2);
    const cz = Math.floor(z / HEIGHT_CELL + HEIGHT_CACHE_SIZE / 2);
    if (cx < 0 || cx >= HEIGHT_CACHE_SIZE || cz < 0 || cz >= HEIGHT_CACHE_SIZE) {
      return calcHeight(x, z);
    }
    const idx = cz * HEIGHT_CACHE_SIZE + cx;
    if (heightCacheValid[idx]) {
      return heightCache[idx];
    }
    const h = calcHeight(x, z);
    heightCache[idx] = h;
    heightCacheValid[idx] = 1;
    return h;
  }

  function calcHeight(x, z) {
    const bw = biomeWeights(x, z);

    const base = SimplexNoise.fbm(x * 0.0008, z * 0.0008, 8, 2.0, 0.5);
    const mid = SimplexNoise.fbm(x * 0.003, z * 0.003, 5, 2.0, 0.5) * 0.35;
    const fine = SimplexNoise.fbm(x * 0.012, z * 0.012, 3, 2.0, 0.5) * 0.08;
    const micro = SimplexNoise.noise2D(x * 0.08, z * 0.08) * 0.02;

    const ridgeRaw = 1 - Math.abs(SimplexNoise.fbm(x * 0.0015, z * 0.0015, 6, 2.1, 0.55));
    const ridge = Math.pow(ridgeRaw, 2.0) * 25;

    let height = (base * 0.55 + 0.45) * MAX_ELEVATION * 0.45 + mid * MAX_ELEVATION + fine * MAX_ELEVATION + micro * MAX_ELEVATION + ridge * 0.3;

    let peakHeight = 0;
    for (const peak of PEAKS) {
      const dx = x - peak.x;
      const dz = z - peak.z;
      const distSq = dx * dx + dz * dz;
      const r = peak.radius;
      if (distSq < r * r) {
        const normDist = Math.sqrt(distSq) / r;
        const shape = Math.pow(1 - normDist, peak.steepness);
        peakHeight += peak.height * shape;
      }
    }
    const peakBlend = Math.max(bw.SNOW * 0.8, bw.LAVA * 0.7, bw.DESERT * 0.4, bw.FOREST * 0.3, bw.PLAINS * 0.15);
    height += peakHeight * peakBlend;

    if (bw.SNOW > 0.1) {
      const mtnRidge = Math.pow(Math.max(0, SimplexNoise.fbm(x * 0.002, z * 0.002, 5, 2.2, 0.55) + 0.2), 2.5) * bw.SNOW * 60;
      const mtnBase = Math.max(0, SimplexNoise.fbm(x * 0.001, z * 0.001, 3) - 0.2) * bw.SNOW * 30;
      height += mtnRidge + mtnBase;
    }
    if (bw.DESERT > 0.1) {
      const yardang = Math.abs(SimplexNoise.noise2D(x * 0.006, z * 0.001)) * bw.DESERT * 20;
      const dunes = Math.abs(SimplexNoise.fbm(x * 0.008, z * 0.005, 3)) * bw.DESERT * 8;
      height += yardang + dunes;
    }
    if (bw.FOREST > 0.1) {
      const hills = SimplexNoise.fbm(x * 0.0025, z * 0.0025, 5) * bw.FOREST * 20;
      const valleys = -Math.abs(SimplexNoise.fbm(x * 0.004, z * 0.004, 3)) * bw.FOREST * 6;
      height += hills + valleys;
    }
    if (bw.LAVA > 0.1) {
      const rift = -Math.abs(SimplexNoise.fbm(x * 0.0015 + 100, z * 0.0015 + 100, 4)) * bw.LAVA * 45;
      const volcano = Math.pow(Math.max(0, SimplexNoise.fbm(x * 0.004, z * 0.004, 3) - 0.15), 1.8) * bw.LAVA * 50;
      height += rift + volcano;
    }
    if (bw.PLAINS > 0.2) {
      const plainsRoll = SimplexNoise.fbm(x * 0.002, z * 0.002, 4) * bw.PLAINS * 8;
      height = height * (0.75 + bw.PLAINS * 0.25) + plainsRoll;
    }

    const rDist = riverDistance(x, z);
    const riverDepth = 18 * Math.exp(-rDist * rDist / 1800);
    height -= riverDepth;

    const distVillage = Math.sqrt(x * x + z * z);
    if (distVillage < VILLAGE_RADIUS) {
      const targetY = 20;
      const blend = 1 - (distVillage / VILLAGE_RADIUS) * (distVillage / VILLAGE_RADIUS);
      height = height * (1 - blend) + targetY * blend;
    }

    return height;
  }

  function getHeight(x, z) {
    return getHeightCached(Math.round(x * 10) / 10, Math.round(z * 10) / 10);
  }

  function getBiomeName(x, z) {
    const bw = biomeWeights(x, z);
    let maxW = 0, maxKey = 'PLAINS';
    for (const [k, w] of Object.entries(bw)) {
      if (w > maxW) { maxW = w; maxKey = k; }
    }
    return BIOMES[maxKey].name;
  }

  function isUnderwater(x, z) {
    return getHeight(x, z) < WATER_LEVEL;
  }

  function createTerrain(textures) {
    const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, SEGMENTS, SEGMENTS);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, getHeight(x, z));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.95,
      metalness: 0.0,
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uGrass = { value: textures.grass };
      shader.uniforms.uRock = { value: textures.rock };
      shader.uniforms.uSnow = { value: textures.snow };
      shader.uniforms.uSand = { value: textures.sand };
      shader.uniforms.uWorldSize = { value: WORLD_SIZE };
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uWaterLevel = { value: WATER_LEVEL };

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         varying vec3 vWorldPos;
         varying vec3 vNormalW;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
         vWorldPos = worldPosition.xyz;
         vNormalW = normalize(mat3(modelMatrix) * objectNormal);`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         uniform sampler2D uGrass;
         uniform sampler2D uRock;
         uniform sampler2D uSnow;
         uniform sampler2D uSand;
         uniform float uWorldSize;
         uniform float uTime;
         uniform float uWaterLevel;
         varying vec3 vWorldPos;
         varying vec3 vNormalW;

         void biomeWeightsFn(vec2 p, out float wP, out float wD, out float wS, out float wF, out float wL) {
           vec2 plainsC = vec2(0.5, 0.5);
           vec2 desertC = vec2(0.92, 0.5);
           vec2 snowC   = vec2(0.5, 0.08);
           vec2 forestC = vec2(0.08, 0.5);
           vec2 lavaC   = vec2(0.5, 0.92);
           float vP = pow(1.0 / (distance(p, plainsC) + 0.06), 2.8);
           float vD = pow(1.0 / (distance(p, desertC) + 0.06), 2.8);
           float vS = pow(1.0 / (distance(p, snowC)   + 0.06), 2.8);
           float vF = pow(1.0 / (distance(p, forestC) + 0.06), 2.8);
           float vL = pow(1.0 / (distance(p, lavaC)   + 0.06), 2.8);
           float total = vP + vD + vS + vF + vL;
           wP = vP / total;
           wD = vD / total;
           wS = vS / total;
           wF = vF / total;
           wL = vL / total;
         }`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        float slope = vNormalW.y;
        float flatMask = smoothstep(0.5, 0.8, slope);
        float elev = vWorldPos.y;

        vec2 nPos = (vWorldPos.xz + uWorldSize * 0.5) / uWorldSize;

        vec2 uvG = vWorldPos.xz * 0.03;
        vec2 uvR = vWorldPos.xz * 0.05;
        vec2 uvS = vWorldPos.xz * 0.04;
        vec2 uvN = vWorldPos.xz * 0.02;

        vec3 cGrass = texture2D(uGrass, uvG).rgb;
        vec3 cRock  = texture2D(uRock,  uvR).rgb;
        vec3 cSnow  = texture2D(uSnow,  uvS).rgb;
        vec3 cSand  = texture2D(uSand,  uvN).rgb;

        vec3 cForest = cGrass * vec3(0.5, 0.7, 0.45);
        vec3 cLava = cRock * vec3(0.75, 0.35, 0.25);

        float wP, wD, wS, wF, wL;
        biomeWeightsFn(nPos, wP, wD, wS, wF, wL);

        vec3 flatColor = vec3(0.0);
        flatColor += cGrass * wP;
        flatColor += cSand  * wD;
        flatColor += cSnow  * wS;
        flatColor += cForest * wF;
        flatColor += cLava * wL;

        vec3 rockColor = cRock;
        rockColor = mix(rockColor, cSnow * 0.7, wS * 0.6);
        rockColor = mix(rockColor, cRock * vec3(0.6, 0.3, 0.2), wL * 0.5);

        vec3 finalColor = mix(rockColor, flatColor, flatMask);

        float snowLine = 100.0 - wS * 70.0 + wD * 30.0 + wL * 40.0;
        float snowAmt = smoothstep(snowLine - 20.0, snowLine + 30.0, elev);
        snowAmt *= flatMask;
        snowAmt += wS * 0.3 * flatMask;
        snowAmt = clamp(snowAmt, 0.0, 1.0);
        finalColor = mix(finalColor, cSnow, snowAmt);

        float shoreDist = elev - uWaterLevel;
        float shoreAmt = 1.0 - smoothstep(0.0, 6.0, shoreDist);
        finalColor = mix(finalColor, cSand, shoreAmt * 0.7 * flatMask);

        diffuseColor = vec4(finalColor, 1.0);
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #ifdef USE_EMISSIVEMAP
          vec4 emissiveColor = texture2D( emissiveMap, vUv );
          totalEmissiveRadiance *= emissiveColor.rgb;
        #endif
        vec2 nPosE = (vWorldPos.xz + uWorldSize * 0.5) / uWorldSize;
        float wPE, wDE, wSE, wFE, wLE;
        biomeWeightsFn(nPosE, wPE, wDE, wSE, wFE, wLE);
        float lavaEmit = wLE * smoothstep(25.0, -15.0, vWorldPos.y) * 0.5;
        totalEmissiveRadiance += vec3(1.0, 0.3, 0.05) * lavaEmit * (1.0 + 0.2 * sin(uTime * 1.2 + vWorldPos.x * 0.03 + vWorldPos.z * 0.02));
        `
      );

      mat.userData.shader = shader;
    };

    mat.emissive = new THREE.Color(0x000000);
    mat.emissiveIntensity = 1.0;

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.userData.update = (dt) => {
      if (mat.userData.shader) {
        mat.userData.shader.uniforms.uTime.value += dt;
      }
    };
    mesh.userData.material = mat;

    return mesh;
  }

  function createWater() {
    const geo = new THREE.PlaneGeometry(WORLD_SIZE * 0.95, WORLD_SIZE * 0.95, 64, 64);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({
      color: 0x4a88b0,
      transparent: true,
      opacity: 0.72,
      roughness: 0.15,
      metalness: 0.3,
    });

    const pos = geo.attributes.position;
    const baseY = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) baseY[i] = pos.getY(i);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = WATER_LEVEL;
    mesh.receiveShadow = true;

    let time = 0;
    mesh.userData.update = (dt) => {
      time += dt;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const wave = Math.sin(x * 0.02 + time * 0.7) * Math.cos(z * 0.02 + time * 0.9) * 0.3
                   + Math.sin(x * 0.05 + time * 1.3) * 0.1;
        pos.setY(i, baseY[i] + wave);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    };

    return mesh;
  }

  function createMountains(textures) {
    const group = new THREE.Group();

    const layers = [
      { ringR: WORLD_SIZE * 0.68, count: 40, hMin: 200, hMax: 400, rMin: 120, rMax: 200, opacity: 0.5 },
      { ringR: WORLD_SIZE * 0.80, count: 50, hMin: 250, hMax: 500, rMin: 150, rMax: 250, opacity: 0.3 },
    ];

    for (const layer of layers) {
      for (let i = 0; i < layer.count; i++) {
        const angle = (i / layer.count) * Math.PI * 2 + SimplexNoise.noise2D(i * 8, layer.ringR * 0.01) * 0.15;
        const dist = layer.ringR + SimplexNoise.noise2D(i * 18, layer.ringR * 0.02) * (layer.rMax * 0.5);
        const mx = Math.cos(angle) * dist;
        const mz = Math.sin(angle) * dist;

        const h = layer.hMin + Math.abs(SimplexNoise.noise2D(i * 12, layer.ringR * 0.03)) * (layer.hMax - layer.hMin);
        const r = layer.rMin + Math.abs(SimplexNoise.noise2D(i * 20, layer.ringR * 0.04)) * (layer.rMax - layer.rMin);

        const geo = new THREE.ConeGeometry(r, h, 12, 2, false);
        const mat = new THREE.MeshStandardMaterial({
          map: textures.rock,
          roughness: 1,
          color: new THREE.Color().setHSL(0.58, 0.15, 0.5 + (1 - layer.opacity) * 0.2),
          transparent: true,
          opacity: layer.opacity,
        });
        const mountain = new THREE.Mesh(geo, mat);

        const groundH = getHeight(mx, mz);
        mountain.position.set(mx, groundH + h / 2, mz);
        mountain.rotation.y = Math.random() * Math.PI;
        mountain.castShadow = false;
        mountain.receiveShadow = false;
        mountain.userData.isDecoration = true;
        group.add(mountain);
      }
    }

    return group;
  }

  function findBuildingSpot(cx, cz, radius) {
    let bestX = cx, bestZ = cz, bestY = -999;
    const steps = 12;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const r = radius * (0.3 + Math.random() * 0.7);
      const tx = cx + Math.cos(angle) * r;
      const tz = cz + Math.sin(angle) * r;
      const ty = getHeight(tx, tz);
      if (ty > WATER_LEVEL + 3 && ty > bestY - 1) {
        bestX = tx; bestZ = tz; bestY = ty;
      }
    }
    const distCenter = Math.sqrt(cx * cx + cz * cz);
    if (distCenter < VILLAGE_RADIUS * 0.8) {
      bestX = cx; bestZ = cz; bestY = getHeight(cx, cz);
    }
    return { x: bestX, z: bestZ, y: bestY };
  }

  return {
    createTerrain,
    createWater,
    createMountains,
    getHeight,
    getBiomeName,
    biomeWeights,
    isUnderwater,
    findBuildingSpot,
    WORLD_SIZE,
    WATER_LEVEL,
    VILLAGE_RADIUS,
    BIOMES,
    RIVER_PATH,
  };
})();
