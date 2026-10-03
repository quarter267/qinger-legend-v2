// ==================== 场景对象 ====================
const WorldObjects = (() => {

  function createTree(textures, type = 'broadleaf', scale = 1) {
    const group = new THREE.Group();

    const trunkH = 4 * scale;
    const trunkGeo = new THREE.CylinderGeometry(0.3 * scale, 0.5 * scale, trunkH, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ map: textures.bark, roughness: 0.95 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    const leavesMat = new THREE.MeshStandardMaterial({
      map: textures.leaves, roughness: 0.9, side: THREE.DoubleSide,
    });

    if (type === 'pine') {
      const layers = 5;
      for (let i = 0; i < layers; i++) {
        const r = (2.0 - i * 0.35) * scale;
        const h = 1.6 * scale;
        const leafGeo = new THREE.ConeGeometry(r, h, 8);
        const pineMat = new THREE.MeshStandardMaterial({ color: 0x2a5a3a, map: textures.leaves, roughness: 0.9 });
        const leaf = new THREE.Mesh(leafGeo, pineMat);
        leaf.position.y = (trunkH + i * 1.1) * scale;
        leaf.castShadow = true;
        group.add(leaf);
      }
    } else if (type === 'cactus') {
      group.remove(trunk);
      const cactusMat = new THREE.MeshStandardMaterial({ color: 0x3d8c4a, roughness: 0.9 });
      const mainGeo = new THREE.CylinderGeometry(0.5 * scale, 0.65 * scale, 4 * scale, 8);
      const main = new THREE.Mesh(mainGeo, cactusMat);
      main.position.y = 2 * scale;
      main.castShadow = true;
      group.add(main);
      for (let i = 0; i < 2; i++) {
        const armGeo = new THREE.CylinderGeometry(0.2 * scale, 0.25 * scale, 1.8 * scale, 6);
        const arm = new THREE.Mesh(armGeo, cactusMat);
        arm.position.set((i === 0 ? 0.7 : -0.7) * scale, 2.5 * scale, 0);
        arm.rotation.z = (i === 0 ? -0.4 : 0.4);
        arm.castShadow = true;
        group.add(arm);
      }
    } else if (type === 'dead') {
      const deadMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 1 });
      group.remove(trunk);
      const deadTrunkGeo = new THREE.CylinderGeometry(0.2 * scale, 0.4 * scale, trunkH * 1.2, 6);
      const deadTrunk = new THREE.Mesh(deadTrunkGeo, deadMat);
      deadTrunk.position.y = trunkH * 0.6;
      deadTrunk.castShadow = true;
      group.add(deadTrunk);
      for (let i = 0; i < 4; i++) {
        const branchGeo = new THREE.CylinderGeometry(0.06 * scale, 0.1 * scale, 1.5 * scale, 4);
        const branch = new THREE.Mesh(branchGeo, deadMat);
        const angle = (i / 4) * Math.PI * 2;
        branch.position.set(Math.cos(angle) * 0.3 * scale, trunkH * 0.7, Math.sin(angle) * 0.3 * scale);
        branch.rotation.z = (i % 2 ? 0.5 : -0.5);
        branch.rotation.y = angle;
        branch.castShadow = true;
        group.add(branch);
      }
    } else {
      const leafPositions = [
        [0, 5.5, 0, 1.8], [1.1, 4.8, 0.4, 1.3], [-0.9, 4.5, -0.5, 1.2],
        [0.4, 6.2, 0.3, 1.1], [-0.5, 5.7, 0.9, 1.0], [0.6, 4.2, -1.0, 1.1],
        [-1.2, 5.0, 0.2, 0.9], [1.0, 5.8, -0.6, 0.9],
      ];
      for (const [x, y, z, r] of leafPositions) {
        const leafGeo = new THREE.SphereGeometry(r * scale, 8, 6);
        const leaf = new THREE.Mesh(leafGeo, leavesMat);
        leaf.position.set(x * scale, y * scale, z * scale);
        leaf.castShadow = true;
        group.add(leaf);
      }
    }

    group.userData.type = 'tree';
    if (typeof CollisionSystem !== 'undefined') {
      const trunkRadius = (type === 'cactus' ? 0.6 : 0.35) * scale;
      CollisionSystem.addBox(0, 0, trunkRadius, trunkRadius, 'tree');
      group.userData.colliderRadius = trunkRadius;
    }
    return group;
  }

  function createHouse(textures, opts = {}) {
    const w = opts.w || 10;
    const h = opts.h || 6;
    const d = opts.d || 8;
    const color = opts.color || 0xffffff;
    const type = opts.type || 'house';

    const group = new THREE.Group();
    const wallThickness = 0.5;

    const foundMat = new THREE.MeshStandardMaterial({ color: 0x6b6560, roughness: 0.95 });
    const foundGeo = new THREE.BoxGeometry(w + 0.8, 0.6, d + 0.8);
    const found = new THREE.Mesh(foundGeo, foundMat);
    found.position.y = 0.3;
    found.receiveShadow = true;
    group.add(found);

    const wallMat = new THREE.MeshStandardMaterial({ map: textures.wood, roughness: 0.85, color: color });

    const doorW = 1.5;
    const doorH = 2.8;
    const doorY = 0.6 + doorH / 2;

    const frontLeftW = (w - doorW) / 2;
    const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(frontLeftW, h, wallThickness), wallMat);
    frontLeft.position.set(-w/2 + frontLeftW/2, 0.6 + h/2, d/2);
    frontLeft.castShadow = true;
    frontLeft.receiveShadow = true;
    group.add(frontLeft);

    const frontRight = new THREE.Mesh(new THREE.BoxGeometry(frontLeftW, h, wallThickness), wallMat);
    frontRight.position.set(w/2 - frontLeftW/2, 0.6 + h/2, d/2);
    frontRight.castShadow = true;
    frontRight.receiveShadow = true;
    group.add(frontRight);

    const lintelH = h - doorH;
    if (lintelH > 0.1) {
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.05, lintelH, wallThickness), wallMat);
      lintel.position.set(0, 0.6 + doorH + lintelH/2, d/2);
      lintel.castShadow = true;
      lintel.receiveShadow = true;
      group.add(lintel);
    }

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThickness), wallMat);
    backWall.position.set(0, 0.6 + h/2, -d/2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    group.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, h, d), wallMat);
    leftWall.position.set(-w/2, 0.6 + h/2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    group.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, h, d), wallMat);
    rightWall.position.set(w/2, 0.6 + h/2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    group.add(rightWall);

    const doorMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 });
    const doorGeo = new THREE.BoxGeometry(doorW - 0.1, doorH, 0.12);
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, doorY, d/2 + 0.1);
    door.userData.noCollision = true;
    group.add(door);
    const handleGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const handle = new THREE.Mesh(handleGeo, new THREE.MeshStandardMaterial({ color: 0xd4a040, metalness: 0.8, roughness: 0.3 }));
    handle.position.set(0.45, doorY, d/2 + 0.18);
    handle.userData.noCollision = true;
    group.add(handle);

    const windowMat = new THREE.MeshStandardMaterial({ color: 0xffeedd, emissive: 0xffcc66, emissiveIntensity: 0.2 });
    const windowY = 0.6 + h * 0.6;
    const windowZ = d/2 - wallThickness/2 + 0.05;
    for (let i = 0; i < 2; i++) {
      const wx = i === 0 ? -w * 0.35 : w * 0.35;
      const wGeo = new THREE.BoxGeometry(1.2, 1.2, 0.1);
      const wi = new THREE.Mesh(wGeo, windowMat);
      wi.position.set(wx, windowY, windowZ);
      wi.userData.noCollision = true;
      wi.userData.isWindowLight = true;
      group.add(wi);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.8 });
      const topFrame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.12), frameMat);
      topFrame.position.set(wx, windowY + 0.6, windowZ + 0.02);
      topFrame.userData.noCollision = true;
      group.add(topFrame);
      const botFrame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.12), frameMat);
      botFrame.position.set(wx, windowY - 0.6, windowZ + 0.02);
      botFrame.userData.noCollision = true;
      group.add(botFrame);
      const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, 0.12), frameMat);
      leftFrame.position.set(wx - 0.6, windowY, windowZ + 0.02);
      leftFrame.userData.noCollision = true;
      group.add(leftFrame);
      const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, 0.12), frameMat);
      rightFrame.position.set(wx + 0.6, windowY, windowZ + 0.02);
      rightFrame.userData.noCollision = true;
      group.add(rightFrame);
      const midH = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.1), frameMat);
      midH.position.set(wx, windowY, windowZ + 0.03);
      midH.userData.noCollision = true;
      group.add(midH);
      const midV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.1), frameMat);
      midV.position.set(wx, windowY, windowZ + 0.03);
      midV.userData.noCollision = true;
      group.add(midV);
    }

    const roofH = h * 0.5;
    const roofW = w + 0.6;
    const roofD = d + 0.4;
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.8 });

    const roofShape = new THREE.Shape();
    roofShape.moveTo(-roofW / 2, 0);
    roofShape.lineTo(roofW / 2, 0);
    roofShape.lineTo(0, roofH);
    roofShape.lineTo(-roofW / 2, 0);

    const extrudeSettings = { depth: roofD, bevelEnabled: false };
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 0.6 + h, -roofD / 2);
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);

    const ridgeGeo = new THREE.BoxGeometry(0.15, 0.15, roofD + 0.1);
    const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.9 });
    const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
    ridge.position.set(0, 0.6 + h + roofH, 0);
    ridge.castShadow = true;
    group.add(ridge);

    group.userData = { type: 'house', height: 0.6 + h + roofH, houseWidth: w, houseDepth: d, houseType: type };

    if (typeof CollisionSystem !== 'undefined') {
      const walls = [
        { lx: -w/2 + frontLeftW/2, lz: d/2, hw: frontLeftW/2, hd: wallThickness/2 },
        { lx: w/2 - frontLeftW/2, lz: d/2, hw: frontLeftW/2, hd: wallThickness/2 },
        { lx: 0, lz: -d/2, hw: w/2, hd: wallThickness/2 },
        { lx: -w/2, lz: 0, hw: wallThickness/2, hd: d/2 },
        { lx: w/2, lz: 0, hw: wallThickness/2, hd: d/2 },
      ];
      group.userData.wallColliders = walls;
    }

    return group;
  }

  function createSignpost(textures, text = '') {
    const group = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ map: textures.wood, roughness: 0.9 });
    const postGeo = new THREE.CylinderGeometry(0.15, 0.2, 4, 6);
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.y = 2;
    post.castShadow = true;
    group.add(post);
    const boardMat = new THREE.MeshStandardMaterial({ map: textures.wood, roughness: 0.85, color: 0xddbb88 });
    const boardGeo = new THREE.BoxGeometry(3, 1.5, 0.15);
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.y = 3.3;
    board.castShadow = true;
    group.add(board);
    group.userData.type = 'signpost';
    return group;
  }

  function createFarmField(textures, rows = 4, cols = 3) {
    const group = new THREE.Group();
    const fieldW = 8;
    const fieldD = 6;
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x6b5030, roughness: 1 });
    const soilGeo = new THREE.BoxGeometry(fieldW, 0.2, fieldD);
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = 0.1;
    soil.receiveShadow = true;
    group.add(soil);
    for (let r = 0; r < rows; r++) {
      const ridgeGeo = new THREE.BoxGeometry(fieldW - 0.5, 0.15, 0.5);
      const ridge = new THREE.Mesh(ridgeGeo, soilMat);
      const z = -fieldD / 2 + 0.5 + r * (fieldD - 1) / (rows - 1 || 1);
      ridge.position.set(0, 0.25, z);
      ridge.receiveShadow = true;
      group.add(ridge);
      const cropMat = new THREE.MeshStandardMaterial({ color: 0x4a8c3a, roughness: 0.8 });
      for (let c = 0; c < cols; c++) {
        const cx = -fieldW / 2 + 1 + c * (fieldW - 2) / (cols || 1);
        const cropGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 4);
        const crop = new THREE.Mesh(cropGeo, cropMat);
        crop.position.set(cx, 0.55, z);
        group.add(crop);
      }
    }
    group.userData.type = 'farm';
    return group;
  }

  function createSandPillar(textures, scale = 1) {
    const group = new THREE.Group();
    const h = (8 + Math.random() * 12) * scale;
    const r = (1.5 + Math.random() * 1.5) * scale;
    const geo = new THREE.CylinderGeometry(r * 0.8, r, h, 7);
    const mat = new THREE.MeshStandardMaterial({ map: textures.sand, roughness: 0.95, color: 0xccaa66 });
    const pillar = new THREE.Mesh(geo, mat);
    pillar.position.y = h / 2;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);
    const topGeo = new THREE.CylinderGeometry(r * 0.9, r * 0.85, 0.8, 7);
    const top = new THREE.Mesh(topGeo, mat);
    top.position.y = h - 0.4;
    group.add(top);
    group.userData.type = 'pillar';
    return group;
  }

  function createLavaPool(radius = 8) {
    const group = new THREE.Group();
    const geo = new THREE.CircleGeometry(radius, 16);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8, roughness: 0.2 });
    const pool = new THREE.Mesh(geo, mat);
    pool.receiveShadow = false;
    group.add(pool);
    let t = 0;
    group.userData.update = (dt) => {
      t += dt;
      mat.emissiveIntensity = 0.7 + Math.sin(t * 2) * 0.15;
    };
    group.userData.type = 'lavapool';
    return group;
  }

  function createNPC(textures, role = 'villager') {
    const group = new THREE.Group();
    const colors = {
      elder:   { robe: 0x4a3a6b, accent: 0xd4b070 },
      smith:   { robe: 0x6b3a1a, accent: 0x888888 },
      healer:  { robe: 0x2a6b5a, accent: 0xff99aa },
      merchant:{ robe: 0x6b5a2a, accent: 0xd4a040 },
      fisher:  { robe: 0x2a4a6b, accent: 0x6699cc },
      villager:{ robe: 0x6b6b4a, accent: 0xaa9966 },
    };
    const c = colors[role] || colors.villager;
    const robeMat = new THREE.MeshStandardMaterial({ color: c.robe, roughness: 0.85 });
    const bodyGeo = new THREE.CylinderGeometry(0.45, 0.6, 1.3, 8);
    const body = new THREE.Mesh(bodyGeo, robeMat);
    body.position.y = 0.85;
    body.castShadow = true;
    group.add(body);
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe8c4a0, roughness: 0.7 });
    const headGeo = new THREE.SphereGeometry(0.3, 8, 6);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.85;
    head.castShadow = true;
    group.add(head);
    const hairColor = role === 'elder' ? 0xdcdcdc : 0x1a1020;
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });
    const hairGeo = new THREE.SphereGeometry(0.31, 8, 5, 0, Math.PI * 2, 0, Math.PI * 1.8 / 2.5);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.88;
    group.add(hair);
    if (role === 'elder') {
      const hatGeo = new THREE.ConeGeometry(0.35, 0.4, 6);
      const hat = new THREE.Mesh(hatGeo, hairMat);
      hat.position.y = 2.35;
      group.add(hat);
    } else if (role === 'smith') {
      const apronMat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.9 });
      const apronGeo = new THREE.BoxGeometry(0.7, 0.9, 0.05);
      const apron = new THREE.Mesh(apronGeo, apronMat);
      apron.position.set(0, 0.85, 0.58);
      group.add(apron);
      const hammerHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 4), new THREE.MeshStandardMaterial({ color: 0x5c4028 }));
      hammerHandle.position.set(0.6, 0.8, 0.3);
      hammerHandle.rotation.z = -0.5;
      group.add(hammerHandle);
      const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.3), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.4 }));
      hammerHead.position.set(0.85, 1.05, 0.3);
      group.add(hammerHead);
    } else if (role === 'healer') {
      const flowerMat = new THREE.MeshStandardMaterial({ color: c.accent, roughness: 0.6 });
      for (let i = 0; i < 6; i++) {
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 4, 4), flowerMat);
        const a = (i / 6) * Math.PI * 2;
        f.position.set(Math.cos(a) * 0.28, 2.1, Math.sin(a) * 0.28);
        group.add(f);
      }
    } else if (role === 'merchant') {
      const hatGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.08, 8);
      const hat = new THREE.Mesh(hatGeo, new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 }));
      hat.position.y = 2.15;
      group.add(hat);
      const topGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.3, 8);
      const top = new THREE.Mesh(topGeo, new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 }));
      top.position.y = 2.34;
      group.add(top);
    } else if (role === 'fisher') {
      const hatGeo = new THREE.ConeGeometry(0.5, 0.2, 8);
      const hat = new THREE.Mesh(hatGeo, new THREE.MeshStandardMaterial({ color: 0x7a6040, roughness: 0.9 }));
      hat.position.y = 2.1;
      group.add(hat);
    }
    group.userData = { type: 'npc', role, height: 2.3 };
    return group;
  }

  function createEnemy(type = 'slime') {
    const group = new THREE.Group();
    let attackDamage, speed, maxHealth, exp, isBoss = false;

    if (type === 'slime') {
      const mat = new THREE.MeshStandardMaterial({ color: 0x55bb66, transparent: true, opacity: 0.85, roughness: 0.3, emissive: 0x225533, emissiveIntensity: 0.2 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), mat);
      body.position.y = 0.7;
      body.castShadow = true;
      group.add(body);
      for (let i = 0; i < 2; i++) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        eye.position.set((i ? 0.22 : -0.22), 0.85, 0.55);
        group.add(eye);
        const pup = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), new THREE.MeshStandardMaterial({ color: 0x000000 }));
        pup.position.set((i ? 0.22 : -0.22), 0.85, 0.64);
        group.add(pup);
      }
      attackDamage = 5; speed = 1.8; maxHealth = 25; exp = 10;
    } else if (type === 'wolf') {
      const furMat = new THREE.MeshStandardMaterial({ color: 0x6b5a4a, roughness: 0.95 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.1, 8), furMat);
      body.rotation.z = Math.PI / 2;
      body.position.y = 0.6;
      body.castShadow = true;
      group.add(body);
      for (let i = 0; i < 2; i++) {
        const end = new THREE.Mesh(new THREE.SphereGeometry(0.37, 8, 6), furMat);
        end.position.set((i ? 0.55 : -0.55), 0.6, 0);
        end.castShadow = true;
        group.add(end);
      }
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), furMat);
      head.position.set(0.7, 0.72, 0);
      head.castShadow = true;
      group.add(head);
      for (let i = 0; i < 2; i++) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4), furMat);
        ear.position.set(0.78, 0.95, (i ? 0.12 : -0.12));
        ear.rotation.z = -0.3;
        group.add(ear);
      }
      for (let i = 0; i < 4; i++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 6), furMat);
        leg.position.set((i < 2 ? 0.4 : -0.4), 0.25, (i % 2 ? 0.18 : -0.18));
        group.add(leg);
      }
      for (let i = 0; i < 2; i++) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff2200, emissiveIntensity: 1 }));
        eye.position.set(0.9, 0.78, (i ? 0.08 : -0.08));
        group.add(eye);
      }
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.5, 4), furMat);
      tail.position.set(-0.8, 0.7, 0);
      tail.rotation.z = 0.5;
      group.add(tail);
      attackDamage = 10; speed = 3.2; maxHealth = 40; exp = 25;
    } else if (type === 'golem') {
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a2520, roughness: 0.95, emissive: 0xff3300, emissiveIntensity: 0.15 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(2, 2.8, 1.6), stoneMat);
      body.position.y = 2.6;
      body.castShadow = true;
      group.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.0), stoneMat);
      head.position.y = 4.5;
      group.add(head);
      for (let i = 0; i < 2; i++) {
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.05), new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1 }));
        eye.position.set((i ? 0.25 : -0.25), 4.6, 0.5);
        group.add(eye);
      }
      for (let i = 0; i < 2; i++) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.2, 0.6), stoneMat);
        arm.position.set((i ? 1.3 : -1.3), 2.8, 0);
        arm.castShadow = true;
        group.add(arm);
      }
      for (let i = 0; i < 2; i++) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.7), stoneMat);
        leg.position.set((i ? 0.45 : -0.45), 0.7, 0);
        group.add(leg);
      }
      attackDamage = 25; speed = 1.3; maxHealth = 180; exp = 250; isBoss = true;
    } else if (type === 'ice_wraith') {
      const iceMat = new THREE.MeshStandardMaterial({ color: 0xbbddee, transparent: true, opacity: 0.75, roughness: 0.1, metalness: 0.3, emissive: 0x66aadd, emissiveIntensity: 0.4 });
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.2, 8), iceMat);
      body.position.y = 1.6;
      body.castShadow = true;
      group.add(body);
      const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), iceMat);
      head.position.y = 3.4;
      group.add(head);
      for (let i = 0; i < 2; i++) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 4, 4), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x88ccff, emissiveIntensity: 1 }));
        eye.position.set((i ? 0.15 : -0.15), 3.4, 0.4);
        group.add(eye);
      }
      for (let i = 0; i < 4; i++) {
        const shard = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.8, 4), iceMat);
        const a = (i / 4) * Math.PI * 2;
        shard.position.set(Math.cos(a) * 0.5, 2 + Math.random() * 0.5, Math.sin(a) * 0.5);
        shard.rotation.z = 0.3;
        shard.rotation.y = a;
        group.add(shard);
      }
      attackDamage = 20; speed = 2.2; maxHealth = 140; exp = 200; isBoss = true;
    }

    group.userData = {
      type: 'enemy', enemyType: type,
      health: maxHealth, maxHealth,
      attackDamage, speed, exp, isBoss,
      attackCooldown: 0, state: 'idle',
      idleTimer: 0, idleTarget: null,
    };
    return group;
  }

  function createPlayer() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a3a5a, roughness: 0.75 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 0.95, 8), bodyMat);
    body.position.y = 1.05;
    body.castShadow = true;
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshStandardMaterial({ color: 0xe8c4a0, roughness: 0.7 }));
    head.position.y = 2.0;
    head.castShadow = true;
    group.add(head);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1020, roughness: 0.85 });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.31, 8, 5, 0, Math.PI * 2, 0, Math.PI * 1.8 / 2.5), hairMat);
    hair.position.y = 2.03;
    group.add(hair);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), hairMat);
    bun.position.y = 2.4;
    group.add(bun);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x2a3a5a, roughness: 0.75 });
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 6), armMat);
    leftArm.position.set(-0.48, 1.3, 0);
    leftArm.rotation.z = 0.3;
    leftArm.castShadow = true;
    group.add(leftArm);
    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 6), armMat);
    rightArm.position.set(0.48, 1.3, 0);
    rightArm.rotation.z = -0.3;
    rightArm.castShadow = true;
    group.add(rightArm);
    const swordGroup = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.02), new THREE.MeshStandardMaterial({ color: 0xd0d0e0, metalness: 0.9, roughness: 0.2, emissive: 0x334477, emissiveIntensity: 0.1 }));
    blade.position.y = 0.6;
    blade.castShadow = true;
    swordGroup.add(blade);
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6), new THREE.MeshStandardMaterial({ color: 0x6b3a1a, roughness: 0.85 }));
    hilt.position.y = -0.1;
    swordGroup.add(hilt);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.05), new THREE.MeshStandardMaterial({ color: 0xddbb44, metalness: 0.7, roughness: 0.3 }));
    swordGroup.add(guard);
    swordGroup.position.set(0.55, 1.1, 0.3);
    swordGroup.userData.baseRot = { x: -0.2, y: 0, z: -0.5 };
    swordGroup.rotation.x = -0.2;
    swordGroup.rotation.z = -0.5;
    group.add(swordGroup);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1a2535, roughness: 0.8 });
    for (let i = 0; i < 2; i++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.55, 6), legMat);
      leg.position.set((i ? 0.16 : -0.16), 0.3, 0);
      leg.castShadow = true;
      group.add(leg);
    }
    group.userData = {
      type: 'player', height: 2.35,
      sword: swordGroup, rightArm,
      isAttacking: false, attackTimer: 0,
    };
    return group;
  }

  function createDropItem(type) {
    const group = new THREE.Group();
    const colors = {
      wolf_fang:   [0xeeeecc, 0x333322], slime_gel:   [0x66dd66, 0x226622],
      lava_core:   [0xff5500, 0xff3300], ice_crystal: [0xaaddff, 0x4488cc],
      iron_ore:    [0x9999aa, 0x333344], wood:        [0x8b6914, 0x221100],
      herb:        [0x66cc66, 0x226622], fruit:       [0xff6633, 0x221100],
    };
    const [col, em] = colors[type] || [0xffffff, 0x333333];
    const mat = new THREE.MeshStandardMaterial({ color: col, emissive: em, emissiveIntensity: 0.4, roughness: 0.4, metalness: 0.4 });
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), mat);
    mesh.castShadow = true;
    group.add(mesh);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.2 }));
    group.add(glow);
    group.userData = { type: 'dropItem', itemType: type, bobOffset: Math.random() * Math.PI * 2 };
    return group;
  }

  function createSign(textures) { return createSignpost(textures); }
  function createFarm(textures) { return createFarmField(textures, 4, 3); }
  function createRockPillar(textures, scale) { return createSandPillar(textures, scale); }

  return {
    createTree, createHouse, createSignpost, createFarmField,
    createSandPillar, createLavaPool,
    createNPC, createEnemy, createPlayer, createDropItem,
    createSign, createFarm, createRockPillar,
  };
})();
// ==================== 昼夜循环系统 ====================
const DayNightSystem = (() => {
  let scene, sunLight, ambientLight, hemiLight;
  let gameTime = 0;
  const DAY_LENGTH = 60;
  let phase = 'day';

  function init(sc, sun, ambient, hemi) {
    scene = sc;
    sunLight = sun;
    ambientLight = ambient;
    hemiLight = hemi;
    gameTime = 0.35;
  }

  function update(dt) {
    gameTime += dt / DAY_LENGTH;
    if (gameTime >= 1) gameTime -= 1;
    const hour = gameTime * 24;

    let newPhase;
    if (hour >= 6 && hour < 9) newPhase = 'dawn';
    else if (hour >= 9 && hour < 17) newPhase = 'day';
    else if (hour >= 17 && hour < 20) newPhase = 'dusk';
    else newPhase = 'night';
    if (newPhase !== phase) phase = newPhase;

    const t = gameTime;
    const sunriseT = 0.25;
    const sunsetT = 0.79;

    let dayFactor;
    if (t < sunriseT - 0.04 || t > sunsetT + 0.04) {
      dayFactor = 0;
    } else if (t > sunriseT + 0.04 && t < sunsetT - 0.04) {
      dayFactor = 1;
    } else if (t >= sunriseT - 0.04 && t <= sunriseT + 0.04) {
      const p = (t - (sunriseT - 0.04)) / 0.08;
      dayFactor = Math.sin(p * Math.PI / 2);
    } else {
      const p = (t - (sunsetT - 0.04)) / 0.08;
      dayFactor = Math.cos(p * Math.PI / 2);
    }

    const duskDawnFactor = Math.max(0, 1 - Math.abs(t - 0.77) * 30) + Math.max(0, 1 - Math.abs(t - 0.27) * 30);

    const dayColor = new THREE.Color(0xffe8c0);
    const duskColor = new THREE.Color(0xff8844);
    const sunCol = dayColor.clone().lerp(duskColor, duskDawnFactor * 0.8);
    sunLight.color.copy(sunCol);
    sunLight.intensity = 1.3 * dayFactor + 0.1 * (1 - dayFactor);

    ambientLight.intensity = 0.45 * dayFactor + 0.15 * (1 - dayFactor);
    ambientLight.color.setHex(dayFactor > 0.5 ? 0xaabccc : 0x334466);
    hemiLight.intensity = 0.5 * dayFactor + 0.15 * (1 - dayFactor);

    const fogDay = new THREE.Color(0xb8d4ec);
    const fogDusk = new THREE.Color(0xe89966);
    const fogNight = new THREE.Color(0x1a2440);
    let fogCol = fogDay.clone().lerp(fogDusk, duskDawnFactor * 0.6);
    fogCol = fogCol.lerp(fogNight, 1 - dayFactor);
    scene.fog.color.copy(fogCol);
    scene.background.color.copy(fogCol);

    const isNight = phase === 'night' || (phase === 'dusk' && hour > 18.5);
    if (scene) {
      scene.traverse((obj) => {
        if (obj.isMesh && obj.material && obj.userData && obj.userData.isWindowLight) {
          obj.material.emissiveIntensity = isNight ? 1.2 : 0.2;
        }
      });
    }
  }

  function getPhase() { return phase; }
  function getPhaseName() {
    const names = { day: '☀ 白天', dusk: '🌇 黄昏', night: '🌙 夜晚', dawn: '🌅 黎明' };
    return names[phase] || '☀ 白天';
  }
  function getGameTime() { return gameTime * 24; }

  return { init, update, getPhase, getPhaseName, getGameTime };
})();

// ==================== NPC 系统 ====================
const NPCSystem = (() => {
  let scene, player;
  const npcs = [];

  const NPC_DATA = [
    { role: 'elder',    name: '村长·石砚',   x: 0,   z: 30,  dialogs: ['年轻人，你终于醒了。你是从异界来的吧？','此地名为青耳，五域环绕，妖魔横行。','你既来之，则须习武求生。去铁匠铺找阿锤，打一把趁手的剑。','西面的幽暗古林近来不太平，若有胆量，可去一探究竟。'] },
    { role: 'smith',    name: '铁匠·阿锤',   x: -35, z: 10,  dialogs: ['嘿，外乡人！想要好武器？找我就对了。','用铁矿和狼牙可以升级你的剑，护甲也一样。','野外能挖到铁矿，打狼能取狼牙。多收集些再来找我。','（对话结束后打开锻造面板）'] },
    { role: 'healer',   name: '药师·阿苓',   x: 25,  z: -18, dialogs: ['你身上有伤吧？让我给你看看。','草药能治外伤，但心里的伤，只能靠时间。','需要治疗就随时来找我。'] },
    { role: 'merchant', name: '商人·金算盘', x: -15, z: -20, dialogs: ['客官要点什么？哎，最近生意不好做啊。','东边赤沙雅丹的商路断了，货物运不过来。','等路通了，我给你打个折！'] },
    { role: 'fisher',   name: '渔夫·老渔',   x: 50,  z: 5,   dialogs: ['今天的鱼……唉，越来越少了。','河水好像被什么东西污染了，鱼都往深水里躲。','年轻人，要是往南边去，小心点。'] },
  ];

  function init(sc, pl) {
    scene = sc;
    player = pl;
    for (const data of NPC_DATA) {
      const npc = WorldObjects.createNPC(null, data.role);
      const spot = Terrain.findBuildingSpot(data.x, data.z, 5);
      npc.position.set(spot.x, spot.y, spot.z);
      npc.userData.npcName = data.name;
      npc.userData.dialogs = data.dialogs;
      npc.userData.role = data.role;
      npc.lookAt(new THREE.Vector3(0, npc.position.y, 0));
      scene.add(npc);
      npcs.push(npc);
    }
  }

  function getNPCs() { return npcs; }
  function getNearbyNPC() {
    let closest = null;
    let minDist = 4;
    for (const npc of npcs) {
      const dx = npc.position.x - player.position.x;
      const dz = npc.position.z - player.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < minDist) { minDist = d; closest = npc; }
    }
    return closest;
  }

  function update(dt) {
    const t = performance.now() * 0.001;
    for (const npc of npcs) {
      npc.position.y = npc.position.y + Math.sin(t * 2 + npc.position.x) * 0.002;
    }
  }

  return { init, update, getNPCs, getNearbyNPC };
})();
