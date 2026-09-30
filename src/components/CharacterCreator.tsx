/**
 * In-Depth Create-A-Wrestler (CAW) Suite
 * Features live 3D character viewport, body types, facial features, hairstyles,
 * tattoos, vast ring gear library, custom entrance music previews, and signature/finisher assignment.
 */

import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { WrestlerProfile, CustomCosmetics } from '../game/types';
import { audioEngine } from '../game/audioEngine';
import { haptics } from '../game/haptics';
import { User, Palette, Scissors, ShieldAlert, Sparkles, Music, Flame, Save, ArrowLeft, Play } from 'lucide-react';

interface CharacterCreatorProps {
  initialProfile?: WrestlerProfile;
  onSave: (createdProfile: WrestlerProfile) => void;
  onCancel: () => void;
}

export const CharacterCreator: React.FC<CharacterCreatorProps> = ({
  initialProfile,
  onSave,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<'identity' | 'body' | 'hair_face' | 'tattoos' | 'attire' | 'moves_music'>('identity');

  // Wrestler Customization State
  const [name, setName] = useState(initialProfile?.name || 'The Maverick');
  const [nickname, setNickname] = useState(initialProfile?.nickname || 'Apex Prodigy');
  const [weightClass, setWeightClass] = useState<WrestlerProfile['weightClass']>(initialProfile?.weightClass || 'Heavyweight');
  const [bodyType, setBodyType] = useState<WrestlerProfile['bodyType']>(initialProfile?.bodyType || 'muscular');
  const [skinTone, setSkinTone] = useState<number>(initialProfile?.skinTone || 0xd49b72);
  const [hairStyle, setHairStyle] = useState<WrestlerProfile['hairStyle']>(initialProfile?.hairStyle || 'undercut');
  const [hairColor, setHairColor] = useState<number>(initialProfile?.hairColor || 0x18181b);
  const [trunkColor, setTrunkColor] = useState<number>(initialProfile?.trunkColor || 0xdc2626); // Crimson
  const [bootColor, setBootColor] = useState<number>(initialProfile?.bootColor || 0x18181b);

  // Cosmetics & Tattoos
  const [tattooStyle, setTattooStyle] = useState<CustomCosmetics['tattooStyle']>(initialProfile?.cosmetics?.tattooStyle || 'tribal_sleeve');
  const [facialHair, setFacialHair] = useState<CustomCosmetics['facialHair']>(initialProfile?.cosmetics?.facialHair || 'stubble');
  const [gearType, setGearType] = useState<CustomCosmetics['gearType']>(initialProfile?.cosmetics?.gearType || 'classic_trunks');
  const [entranceMusic, setEntranceMusic] = useState<CustomCosmetics['entranceMusic']>(initialProfile?.cosmetics?.entranceMusic || 'arena_heavy_rock');
  const [entrancePyro, setEntrancePyro] = useState<CustomCosmetics['entrancePyro']>(initialProfile?.cosmetics?.entrancePyro || 'flames');

  // Moves & Taunts
  const [signatureMove, setSignatureMove] = useState(initialProfile?.signatureMove || 'Spinebuster & Lariat');
  const [finisherMove, setFinisherMove] = useState(initialProfile?.finisherMove || 'The Apex Cataclysm');
  const [tauntPhrase, setTauntPhrase] = useState(initialProfile?.tauntPhrase || 'NOBODY CAN STOP THE PAIN!');

  // Live 3D Preview Canvas
  const previewCanvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize Three.js live preview
  useEffect(() => {
    if (!previewCanvasRef.current) return;
    const container = previewCanvasRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 1.4, 3.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff5ea, 2.5);
    dirLight.position.set(2, 4, 3);
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0xef4444, 2.0);
    rimLight.position.set(-2, 2, -3);
    scene.add(rimLight);

    // Floor Pedestal
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.3, 0.15, 32),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6, metalness: 0.3 })
    );
    pedestal.position.y = -0.075;
    scene.add(pedestal);

    // Render loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      if (modelGroupRef.current) {
        modelGroupRef.current.rotation.y += 0.008; // Gentle turntable rotation
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update 3D Character Model when options change
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    if (modelGroupRef.current) {
      scene.remove(modelGroupRef.current);
    }

    const group = new THREE.Group();

    // Dynamic Skin & Gear Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: skinTone,
      roughness: 0.55,
      metalness: 0.08,
    });
    const trunkMat = new THREE.MeshStandardMaterial({
      color: trunkColor,
      roughness: 0.45,
      metalness: 0.2,
    });
    const bootMat = new THREE.MeshStandardMaterial({
      color: bootColor,
      roughness: 0.4,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.8,
    });

    // Body Scaling
    const bodyScale = bodyType === 'colossal' ? 1.18 : bodyType === 'muscular' ? 1.08 : bodyType === 'lean' ? 0.95 : 1.0;

    // Hips
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.5 * bodyScale, 0.3, 0.32), trunkMat);
    hips.position.y = 0.95;
    group.add(hips);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65 * bodyScale, 0.55, 0.38), skinMat);
    torso.position.y = 1.35;
    group.add(torso);

    // Tattoo preview overlay on chest/arm
    if (tattooStyle !== 'none') {
      const tattooMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.25, 0.3),
        new THREE.MeshBasicMaterial({ color: 0x111827, transparent: true, opacity: 0.8 })
      );
      tattooMesh.position.set(0.12, 1.4, 0.2);
      group.add(tattooMesh);
    }

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), skinMat);
    head.position.y = 1.78;
    group.add(head);

    // Hair
    if (hairStyle !== 'bald') {
      const hair = new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 14, 14, 0, Math.PI * 2, 0, Math.PI / 1.7),
        hairMat
      );
      hair.position.y = 1.79;
      hair.rotation.x = -0.2;
      group.add(hair);
    }

    // Arms
    const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * bodyScale, 0.08, 0.6), skinMat);
    lArm.position.set(-0.45 * bodyScale, 1.25, 0);
    const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * bodyScale, 0.08, 0.6), skinMat);
    rArm.position.set(0.45 * bodyScale, 1.25, 0);
    group.add(lArm);
    group.add(rArm);

    // Legs & Boots
    const legGeo = new THREE.CylinderGeometry(0.11 * bodyScale, 0.08, 0.8);
    const lLeg = new THREE.Mesh(legGeo, bootMat);
    lLeg.position.set(-0.18, 0.45, 0);
    const rLeg = new THREE.Mesh(legGeo, bootMat);
    rLeg.position.set(0.18, 0.45, 0);
    group.add(lLeg);
    group.add(rLeg);

    scene.add(group);
    modelGroupRef.current = group;
  }, [bodyType, skinTone, hairStyle, hairColor, trunkColor, bootColor, tattooStyle]);

  const handlePreviewMusic = () => {
    audioEngine.init();
    audioEngine.playRedSmackFinisher();
    haptics.strikeHeavy();
  };

  const handleSaveWrestler = () => {
    audioEngine.playRingBell();
    haptics.redSmackFinisher();

    const created: WrestlerProfile = {
      id: `caw_${Date.now().toString(36)}`,
      name,
      nickname,
      weightClass,
      themeColor: `#${trunkColor.toString(16).padStart(6, '0')}`,
      accentColor: '#ca8a04',
      avatarColor: '#18181b',
      stats: initialProfile?.stats || {
        speed: 88,
        power: 90,
        submission: 82,
        charisma: 94,
        durability: 89,
      },
      signatureMove,
      finisherMove,
      tauntPhrase,
      description: `Custom created superstar. ${nickname} brings a fearsome combat repertoire to the PAIN federation.`,
      trunkColor,
      bootColor,
      skinTone,
      hairColor,
      hairStyle,
      bodyType,
      isCustom: true,
      cosmetics: {
        tattooStyle,
        facialHair,
        gearType,
        accentTrunkColor: 0xffffff,
        wristTapeColor: 0xffffff,
        kneepadColor: 0x18181b,
        entranceMusic,
        entrancePyro,
        customPortraitUrl: '/src/assets/images/rookie_prodigy_portrait_1790750796395.jpg',
      },
    };

    onSave(created);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-6 bg-zinc-950 text-zinc-100 overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-md text-zinc-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-heading font-black text-xl tracking-wider uppercase text-white">
              CREATE-A-WRESTLER <span className="text-red-500">STUDIO</span>
            </h1>
            <p className="text-xs text-zinc-400">
              Anatomy · Gear · Tattoos · Custom Moves & Entrance
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveWrestler}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-heading font-black text-sm uppercase rounded-lg shadow-lg active:scale-95 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>SAVE WRESTLER</span>
        </button>
      </div>

      {/* Main Grid: 3D Viewport on Left, Customization Tabs on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-4 flex-1 items-stretch">
        {/* 3D LIVE PREVIEW VIEWPORT */}
        <div className="lg:col-span-5 bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between relative shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between z-10">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              3D SUPERSTAR PREVIEW
            </span>
            <span className="text-[10px] text-zinc-500 font-mono-nums">
              AUTO-TURNTABLE ACTIVE
            </span>
          </div>

          <div
            ref={previewCanvasRef}
            className="w-full h-80 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 my-2"
          />

          <div className="bg-zinc-950/80 p-3 rounded-lg border border-zinc-800/80 text-center z-10">
            <h2 className="font-heading font-black text-lg text-white uppercase italic">
              {name}
            </h2>
            <p className="text-xs text-zinc-400 italic">"{nickname}"</p>
          </div>
        </div>

        {/* CUSTOMIZATION SETTINGS TABS */}
        <div className="lg:col-span-7 bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-2xl flex flex-col gap-4">
          {/* Navigation Bar */}
          <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2 overflow-x-auto text-xs">
            {[
              { id: 'identity', label: 'Identity', icon: User },
              { id: 'body', label: 'Body & Skin', icon: Palette },
              { id: 'hair_face', label: 'Hair & Face', icon: Scissors },
              { id: 'tattoos', label: 'Tattoos & Ink', icon: ShieldAlert },
              { id: 'attire', label: 'Gear & Attire', icon: Sparkles },
              { id: 'moves_music', label: 'Moves & Music', icon: Music },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as typeof activeTab);
                    audioEngine.playStrike(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold uppercase transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-zinc-950/60 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: IDENTITY */}
          {activeTab === 'identity' && (
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-300 uppercase">Superstar Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded p-2 text-white font-semibold focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-300 uppercase">Ring Moniker / Nickname</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded p-2 text-white font-semibold focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-300 uppercase">Weight Division</label>
                <select
                  value={weightClass}
                  onChange={(e) => setWeightClass(e.target.value as WrestlerProfile['weightClass'])}
                  className="bg-zinc-950 border border-zinc-700 rounded p-2 text-white font-semibold focus:border-red-500 focus:outline-none"
                >
                  <option value="Cruiserweight">Cruiserweight (&lt; 225 lbs)</option>
                  <option value="Heavyweight">Heavyweight (225 - 280 lbs)</option>
                  <option value="Super Heavyweight">Super Heavyweight (&gt; 280 lbs)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-300 uppercase">Taunt Catchphrase</label>
                <input
                  type="text"
                  value={tauntPhrase}
                  onChange={(e) => setTauntPhrase(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded p-2 text-white font-semibold focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: BODY & SKIN */}
          {activeTab === 'body' && (
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-300 uppercase">Physique & Muscle Anatomy</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'lean', label: 'Lean & Agile' },
                    { id: 'athletic', label: 'Athletic Definition' },
                    { id: 'muscular', label: 'Heavyweight Muscular' },
                    { id: 'colossal', label: 'Colossal Behemoth' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setBodyType(b.id as typeof bodyType)}
                      className={`p-2.5 rounded border text-left font-bold uppercase transition-colors ${
                        bodyType === b.id
                          ? 'border-red-500 bg-red-950/40 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-300 uppercase">Skin Tone Palette</label>
                <div className="flex items-center gap-3">
                  {[
                    0xf5d0b0, // Fair
                    0xdfa585, // Medium Light
                    0xd49b72, // Tan Bronzed
                    0xb5784a, // Rich Bronze
                    0x824e2b, // Deep Brown
                    0x523219, // Dark Obsidian
                  ].map((hex) => (
                    <button
                      key={hex}
                      onClick={() => setSkinTone(hex)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        skinTone === hex ? 'scale-125 border-white shadow-lg' : 'border-zinc-700'
                      }`}
                      style={{ backgroundColor: `#${hex.toString(16).padStart(6, '0')}` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HAIR & FACE */}
          {activeTab === 'hair_face' && (
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-300 uppercase">Hairstyle</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bald', label: 'Shaved / Bald' },
                    { id: 'short', label: 'Classic Buzz' },
                    { id: 'undercut', label: 'Textured Undercut' },
                    { id: 'mohawk', label: 'Punk Mohawk' },
                    { id: 'long', label: 'Long Locks' },
                    { id: 'mask', label: 'Luchador Mask' },
                  ].map((h) => (
                    <button
                      key={h.id}
                      onClick={() => setHairStyle(h.id as typeof hairStyle)}
                      className={`p-2 rounded border text-center font-bold uppercase transition-colors ${
                        hairStyle === h.id
                          ? 'border-red-500 bg-red-950/40 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                      }`}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-300 uppercase">Facial Hair</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'clean', label: 'Clean Shaven' },
                    { id: 'stubble', label: 'Heavy Stubble' },
                    { id: 'goatee', label: 'Goatee' },
                    { id: 'full_beard', label: 'Full Warrior Beard' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFacialHair(f.id as typeof facialHair)}
                      className={`p-2 rounded border text-center font-bold uppercase text-[11px] ${
                        facialHair === f.id
                          ? 'border-amber-400 bg-amber-950/40 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-300 uppercase">Hair Color</label>
                <div className="flex items-center gap-2">
                  {[0x18181b, 0x4a2c11, 0x92400e, 0xd97706, 0xe2ba7a, 0xef4444].map((hex) => (
                    <button
                      key={hex}
                      onClick={() => setHairColor(hex)}
                      className={`w-7 h-7 rounded-full border-2 ${
                        hairColor === hex ? 'scale-125 border-white' : 'border-zinc-700'
                      }`}
                      style={{ backgroundColor: `#${hex.toString(16).padStart(6, '0')}` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TATTOOS */}
          {activeTab === 'tattoos' && (
            <div className="flex flex-col gap-3 text-xs">
              <label className="font-bold text-zinc-300 uppercase">Tattoos & Ink Placement</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'none', label: 'No Tattoos (Clean)' },
                  { id: 'tribal_sleeve', label: 'Tribal Full Arm Sleeve' },
                  { id: 'chest_dragon', label: 'Chest Dragon Crest' },
                  { id: 'back_skull', label: 'Full Back Demon Skull' },
                  { id: 'barbwire', label: 'Barbwire Bicep Bands' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTattooStyle(t.id as typeof tattooStyle)}
                    className={`p-3 rounded border text-left font-bold uppercase transition-colors ${
                      tattooStyle === t.id
                        ? 'border-red-500 bg-red-950/40 text-white'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: GEAR & ATTIRE */}
          {activeTab === 'attire' && (
            <div className="flex flex-col gap-3 text-xs">
              <label className="font-bold text-zinc-300 uppercase">Ring Gear Style</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'classic_trunks', label: 'Classic Pro Trunks' },
                  { id: 'long_tights', label: 'Full Length Tights' },
                  { id: 'singlet', label: 'Collegiate Singlet' },
                  { id: 'cargo_pants', label: 'Hardcore Brawler Pants' },
                ].map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGearType(g.id as typeof gearType)}
                    className={`p-2.5 rounded border text-left font-bold uppercase transition-colors ${
                      gearType === g.id
                        ? 'border-amber-400 bg-amber-950/40 text-white'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-300 uppercase">Primary Gear Color</label>
                <div className="flex items-center gap-2">
                  {[0xdc2626, 0x18181b, 0x2563eb, 0x16a34a, 0x9333ea, 0xd97706, 0xffffff].map((hex) => (
                    <button
                      key={hex}
                      onClick={() => setTrunkColor(hex)}
                      className={`w-7 h-7 rounded-full border-2 ${
                        trunkColor === hex ? 'scale-125 border-white' : 'border-zinc-700'
                      }`}
                      style={{ backgroundColor: `#${hex.toString(16).padStart(6, '0')}` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: MOVES & ENTRANCE MUSIC */}
          {activeTab === 'moves_music' && (
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-300 uppercase">RED SMACKDOWN FINISHER NAME</label>
                <input
                  type="text"
                  value={finisherMove}
                  onChange={(e) => setFinisherMove(e.target.value)}
                  className="bg-zinc-950 border border-red-600/80 rounded p-2 text-red-300 font-bold focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-300 uppercase">SIGNATURE MOVE NAME</label>
                <input
                  type="text"
                  value={signatureMove}
                  onChange={(e) => setSignatureMove(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded p-2 text-white font-semibold focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between bg-zinc-950 p-3 rounded border border-zinc-800">
                <div className="flex flex-col">
                  <span className="font-bold text-white uppercase">Entrance Theme Music</span>
                  <span className="text-[11px] text-zinc-400">Synthesized 2000s Arena Heavy Rock Theme</span>
                </div>
                <button
                  onClick={handlePreviewMusic}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-all active:scale-95"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>PREVIEW</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
