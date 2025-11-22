
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text3D, Center } from '@react-three/drei';
import { v4 as uuidv4 } from 'uuid';
import { useStore, TARGET_LETTERS } from '../../store';
import { GameObject, ObjectType, LANE_WIDTH, SPAWN_DISTANCE, REMOVE_DISTANCE, GameStatus } from '../../types';
import { audio } from '../System/Audio';

// Geometry Constants
const GEM_GEOMETRY = new THREE.IcosahedronGeometry(0.3, 0);
const PORTAL_RING_GEO = new THREE.TorusGeometry(1.3, 0.1, 16, 32);
const PORTAL_BASE_GEO = new THREE.CylinderGeometry(1.6, 1.6, 0.1, 32);
const DEBRIS_GEO = new THREE.BoxGeometry(0.2, 0.2, 0.2); // For explosion

// Cactus Geometry Components
const CACTUS_BODY = new THREE.CylinderGeometry(0.35, 0.3, 1.5, 12);
const CACTUS_ARM = new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8);

// Font for 3D Text
const FONT_URL = "https://cdn.jsdelivr.net/npm/three/examples/fonts/helvetiker_bold.typeface.json";

const DOOR_INTERVAL = 140; // Distance between questions

export const LevelManager: React.FC = () => {
  const { 
    status, 
    speed, 
    collectGem, 
    collectLetter,
    takeDamage,
    collectedLetters,
    setDistance,
    currentOptions,
    handleDoorHit
  } = useStore();
  
  const objectsRef = useRef<GameObject[]>([]);
  const [renderTrigger, setRenderTrigger] = useState(0);
  const prevStatus = useRef(status);

  const playerObjRef = useRef<THREE.Object3D | null>(null);
  const distanceTraveled = useRef(0);
  const nextDoorDistance = useRef(50); // First door appears sooner
  const nextLetterDistance = useRef(300); // Start letters further away (harder)
  const nextObstacleDistance = useRef(80); // Start obstacles soon
  const nextGemDistance = useRef(30); // Designed gem patterns

  // Handle resets
  useEffect(() => {
    const isRestart = status === GameStatus.PLAYING && prevStatus.current === GameStatus.GAME_OVER;
    const isMenuReset = status === GameStatus.MENU;

    if (isMenuReset || isRestart) {
        objectsRef.current = [];
        setRenderTrigger(t => t + 1);
        distanceTraveled.current = 0;
        nextDoorDistance.current = 50;
        nextLetterDistance.current = 300;
        nextObstacleDistance.current = 80;
        nextGemDistance.current = 30;
    } else if (status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) {
        setDistance(Math.floor(distanceTraveled.current));
    }
    
    prevStatus.current = status;
  }, [status, setDistance]);

  useFrame((state) => {
      if (!playerObjRef.current) {
          const group = state.scene.getObjectByName('PlayerGroup');
          if (group && group.children.length > 0) {
              playerObjRef.current = group.children[0];
          }
      }
  });

  useFrame((state, delta) => {
    if (status !== GameStatus.PLAYING) return;

    const safeDelta = Math.min(delta, 0.05); 
    const dist = speed * safeDelta;
    
    distanceTraveled.current += dist;

    let hasChanges = false;
    let playerPos = new THREE.Vector3(0, 0, 0);
    
    if (playerObjRef.current) {
        playerObjRef.current.getWorldPosition(playerPos);
    }

    // 1. Move & Update Objects
    const currentObjects = objectsRef.current;
    const keptObjects: GameObject[] = [];

    for (const obj of currentObjects) {
        const prevZ = obj.position[2];
        obj.position[2] += dist;
        
        let keep = true;

        if (obj.active) {
            // Collision Detection
            const zThreshold = 1.2; 
            // Check depth overlap
            if (obj.position[2] > playerPos.z - zThreshold && prevZ < playerPos.z + zThreshold) {
                
                // Check horizontal overlap
                const dx = Math.abs(obj.position[0] - playerPos.x);
                
                if (dx < 0.8) {
                    if (obj.type === ObjectType.DOOR) {
                        obj.isHit = true;
                        if (obj.isCorrect) {
                            audio.playGemCollect(); 
                            handleDoorHit(true, obj.text);
                            obj.active = false; 
                        } else {
                            audio.playDamage();
                            handleDoorHit(false, obj.text);
                            obj.active = false; 
                        }
                        hasChanges = true;
                    } else if (obj.type === ObjectType.GEM) {
                        const dy = Math.abs(obj.position[1] - playerPos.y);
                        if (dy < 1.2) { // More forgiving gem collision
                            collectGem(obj.points || 50);
                            audio.playGemCollect();
                            obj.active = false;
                            hasChanges = true;
                        }
                    } else if (obj.type === ObjectType.LETTER) {
                        const dy = Math.abs(obj.position[1] - playerPos.y);
                        if (dy < 1.5) { 
                            if (obj.letterChar) collectLetter(obj.letterChar);
                            audio.playLetterCollect();
                            obj.active = false;
                            hasChanges = true;
                        }
                    } else if (obj.type === ObjectType.OBSTACLE) {
                         // Cactus collision - check vertical too (can jump over)
                         const dy = Math.abs(obj.position[1] - playerPos.y);
                         // Cactus is on ground (y=0), height approx 1.5. Player must be above 1.0 to clear roughly.
                         if (dy < 1.2 && playerPos.y < 1.0) {
                             audio.playDamage();
                             takeDamage();
                             obj.active = false;
                             obj.isHit = true; // Trigger shatter
                             hasChanges = true;
                         }
                    }
                }
            }
        }

        // Clean up old objects
        if (obj.position[2] > REMOVE_DISTANCE) {
            keep = false;
            hasChanges = true;
        }

        if (keep) keptObjects.push(obj);
    }

    // 2. Spawning Logic - Questions (Doors)
    if (distanceTraveled.current >= nextDoorDistance.current) {
        const lanes = [-1, 0, 1]; 
        const spawnZ = -SPAWN_DISTANCE;

        lanes.forEach((laneIdx, i) => {
            const option = currentOptions[i];
            if (option) {
                keptObjects.push({
                    id: uuidv4(),
                    type: ObjectType.DOOR,
                    position: [laneIdx * LANE_WIDTH, 0, spawnZ],
                    active: true,
                    text: option.text,
                    isCorrect: option.isCorrect,
                    isHit: false
                });
            }
        });
        // Ensure obstacles don't spawn too close to doors
        nextObstacleDistance.current = Math.max(nextObstacleDistance.current, distanceTraveled.current + 40);
        nextGemDistance.current = Math.max(nextGemDistance.current, distanceTraveled.current + 30);
        
        nextDoorDistance.current += DOOR_INTERVAL;
        hasChanges = true;
    }

    // 3. Spawning Logic - Obstacles (CACTI) + GEM COMBOS
    const distToDoor = Math.abs(distanceTraveled.current - nextDoorDistance.current);
    if (distanceTraveled.current >= nextObstacleDistance.current && distToDoor > 30) {
         // Spawn 1 or 2 cacti
         const lanes = [-1, 0, 1].sort(() => 0.5 - Math.random());
         const count = Math.random() > 0.7 ? 2 : 1;
         const spawnZ = -SPAWN_DISTANCE;
         
         for(let i=0; i<count; i++) {
             const lane = lanes[i];
             keptObjects.push({
                 id: uuidv4(),
                 type: ObjectType.OBSTACLE, // CACTUS
                 position: [lane * LANE_WIDTH, 0, spawnZ],
                 active: true,
                 isHit: false
             });

             // COMBO: Gems above Obstacle (Sky floating)
             if (Math.random() < 0.4) {
                 keptObjects.push({
                     id: uuidv4(),
                     type: ObjectType.GEM,
                     position: [lane * LANE_WIDTH, 3.2, spawnZ], // High up (requires Jump)
                     active: true,
                     color: '#00ffff', // Cyan for sky gems
                     points: 100
                 });
             }

             // COMBO: Gems leading to Obstacle (Ground)
             if (Math.random() < 0.3) {
                 for(let k=1; k<=3; k++) {
                     keptObjects.push({
                         id: uuidv4(),
                         type: ObjectType.GEM,
                         position: [lane * LANE_WIDTH, 1.0, spawnZ + (k * 5)], // Leading up to cactus
                         active: true,
                         color: '#ffff00', // Yellow for ground
                         points: 50
                     });
                 }
             }
         }
         
         // Decrease interval as game progresses
         let interval = 60 - Math.min(20, (speed - 12)); // Faster speed = more cacti
         nextObstacleDistance.current += interval + Math.random() * 30;
         hasChanges = true;
    }

    // 4. Spawning Logic - Letters (F, K, Y, C)
    if (distanceTraveled.current >= nextLetterDistance.current && distToDoor > 40) {
        const missing = TARGET_LETTERS.filter(l => !collectedLetters.includes(l));
        const pool = missing.length > 0 ? missing : TARGET_LETTERS;
        const char = pool[Math.floor(Math.random() * pool.length)];
        const lane = Math.floor(Math.random() * 3) - 1;
        
        keptObjects.push({
            id: uuidv4(),
            type: ObjectType.LETTER,
            position: [lane * LANE_WIDTH, 2.5, -SPAWN_DISTANCE],
            active: true,
            letterChar: char
        });
        
        let baseInterval = 300;
        let variance = 200;
        const currentScore = useStore.getState().score;
        if (currentScore > 3000) { baseInterval = 200; variance = 150; }
        if (currentScore > 6000) { baseInterval = 100; variance = 100; }

        nextLetterDistance.current += baseInterval + Math.random() * variance;
        hasChanges = true;
    }

    // 5. Spawning Logic - DESIGNED GEM PATTERNS
    if (distanceTraveled.current >= nextGemDistance.current && distToDoor > 20) {
        const patternType = Math.floor(Math.random() * 4); // 0-3
        const lane = Math.floor(Math.random() * 3) - 1;
        const spawnZ = -SPAWN_DISTANCE;

        switch (patternType) {
            case 0: // LINE (Ground) - 5 consecutive gems on track
                for (let i = 0; i < 6; i++) {
                    keptObjects.push({
                        id: uuidv4(),
                        type: ObjectType.GEM,
                        position: [lane * LANE_WIDTH, 1.0, spawnZ - (i * 4)],
                        active: true,
                        color: '#ffff00',
                        points: 50
                    });
                }
                break;
            case 1: // SKY LINE - 4 gems high up
                for (let i = 0; i < 4; i++) {
                    keptObjects.push({
                        id: uuidv4(),
                        type: ObjectType.GEM,
                        position: [lane * LANE_WIDTH, 3.2, spawnZ - (i * 4)],
                        active: true,
                        color: '#00ffff',
                        points: 100
                    });
                }
                break;
            case 2: // JUMP ARC (Ground -> Sky -> Ground)
                keptObjects.push({ id: uuidv4(), type: ObjectType.GEM, position: [lane * LANE_WIDTH, 1.0, spawnZ], active: true, color: '#ffff00', points: 50 });
                keptObjects.push({ id: uuidv4(), type: ObjectType.GEM, position: [lane * LANE_WIDTH, 2.2, spawnZ - 4], active: true, color: '#00ffaa', points: 75 });
                keptObjects.push({ id: uuidv4(), type: ObjectType.GEM, position: [lane * LANE_WIDTH, 3.2, spawnZ - 8], active: true, color: '#00ffff', points: 100 });
                keptObjects.push({ id: uuidv4(), type: ObjectType.GEM, position: [lane * LANE_WIDTH, 2.2, spawnZ - 12], active: true, color: '#00ffaa', points: 75 });
                keptObjects.push({ id: uuidv4(), type: ObjectType.GEM, position: [lane * LANE_WIDTH, 1.0, spawnZ - 16], active: true, color: '#ffff00', points: 50 });
                break;
            case 3: // SLALOM - Zig Zag between lanes
                const startLane = 0; 
                for (let i = 0; i < 4; i++) {
                    const currentLane = i % 2 === 0 ? -1 : 1; 
                    keptObjects.push({
                        id: uuidv4(),
                        type: ObjectType.GEM,
                        position: [currentLane * LANE_WIDTH, 1.0, spawnZ - (i * 6)],
                        active: true,
                        color: '#ffff00',
                        points: 50
                    });
                }
                break;
        }
        
        nextGemDistance.current += 70 + Math.random() * 50; // Space out patterns
        hasChanges = true;
    }

    if (hasChanges) {
        objectsRef.current = keptObjects;
        setRenderTrigger(t => t + 1);
    }
  });

  return (
    <group>
      {objectsRef.current.map(obj => {
        if (!obj.active && !obj.isHit) return null;
        return <GameEntity key={obj.id} data={obj} />;
      })}
    </group>
  );
};

// Visual Effect: Rapidly expanding ring for door impact
const DoorHitEffect = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [scale, setScale] = useState(1);
    
    useFrame((state, delta) => {
        if (meshRef.current) {
            // Rapid expansion
            const newScale = scale + delta * 40;
            setScale(newScale);
            meshRef.current.scale.set(newScale, newScale, 1);
            
            // Fade out
            const mat = meshRef.current.material as THREE.MeshBasicMaterial;
            if (mat.opacity > 0) {
                mat.opacity -= delta * 3;
            }
        }
    });

    return (
        <mesh ref={meshRef} position={[0, 1.5, 0]}>
            <ringGeometry args={[0.5, 0.8, 32]} />
            <meshBasicMaterial color="white" transparent opacity={1.0} side={THREE.DoubleSide} />
        </mesh>
    );
};

const ExplosionDebris: React.FC<{ color?: string, isDoor?: boolean }> = ({ color = "#00aaff", isDoor = false }) => {
    const count = isDoor ? 12 : 8;
    const debris = useMemo(() => {
        return new Array(count).fill(0).map(() => ({
            dir: new THREE.Vector3(Math.random()-0.5, Math.random()-0.2, Math.random()-0.5).normalize(),
            speed: 5 + Math.random() * 15,
            rot: new THREE.Vector3(Math.random(), Math.random(), Math.random())
        }));
    }, [count]);
    
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.children.forEach((mesh, i) => {
                if (i < count) { // Debris
                    const d = debris[i];
                    mesh.position.addScaledVector(d.dir, d.speed * delta);
                    mesh.rotation.x += d.rot.x * delta * 5;
                    mesh.rotation.y += d.rot.y * delta * 5;
                }
            });
        }
    });

    return (
        <group ref={groupRef}>
            {/* Flash Ring for Doors */}
            {isDoor && <DoorHitEffect />}
            
            {debris.map((_, i) => (
                <mesh key={i} geometry={DEBRIS_GEO}>
                     <meshBasicMaterial color={color} transparent opacity={0.8} />
                </mesh>
            ))}
        </group>
    );
}

const GameEntity: React.FC<{ data: GameObject }> = React.memo(({ data }) => {
    const groupRef = useRef<THREE.Group>(null);
    const [isExploding, setIsExploding] = useState(false);

    useEffect(() => {
        if (data.isHit && !isExploding) {
            setIsExploding(true);
        }
    }, [data.isHit]);
    
    useFrame((state, delta) => {
        if (groupRef.current && !isExploding) {
            groupRef.current.position.set(data.position[0], 0, data.position[2]);
            
            if (data.type === ObjectType.GEM) {
                 groupRef.current.rotation.y += delta * 2;
                 // Float animation based on base Y
                 groupRef.current.position.y = data.position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.2;
            }

            if (data.type === ObjectType.LETTER) {
                 groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.5;
                 groupRef.current.position.y = data.position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.3;
            }
        } else if (groupRef.current && isExploding) {
             // Move explosion with the flow slightly so it doesn't just stop dead
             groupRef.current.position.z += delta * 5; 
        }
    });

    useEffect(() => {
        if (isExploding) {
            // Remove component logic happens via LevelManager list management, 
            // but we keep this rendered for the duration of the effect
            const timer = setTimeout(() => { }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isExploding]);

    if (isExploding) {
        const debrisColor = data.type === ObjectType.OBSTACLE ? '#00aa00' : '#00aaff';
        const isDoor = data.type === ObjectType.DOOR;
        return (
            <group position={[data.position[0], 1, data.position[2]]}>
                <ExplosionDebris color={debrisColor} isDoor={isDoor} />
            </group>
        )
    }

    return (
        <group ref={groupRef} position={[data.position[0], 0, data.position[2]]}>
            
            {/* --- DOOR / PORTAL --- */}
            {data.type === ObjectType.DOOR && (
                <group>
                    <mesh position={[0, 0.1, 0]} geometry={PORTAL_BASE_GEO}>
                        <meshStandardMaterial color="#111" />
                    </mesh>
                    <mesh position={[0, 1.8, 0]} geometry={PORTAL_RING_GEO}>
                        <meshStandardMaterial 
                            color="#00aaff" 
                            emissive="#00aaff"
                            emissiveIntensity={2}
                            roughness={0.2}
                            metalness={0.8}
                        />
                    </mesh>
                    <mesh position={[0, 1.8, 0]}>
                        <circleGeometry args={[1.2, 32]} />
                        <meshBasicMaterial 
                            color="#00aaff"
                            opacity={0.3} 
                            transparent 
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                </group>
            )}
            
            {/* --- CACTUS (OBSTACLE) --- */}
            {data.type === ObjectType.OBSTACLE && (
                <group position={[0, 0.75, 0]}>
                     {/* Main Body */}
                     <mesh geometry={CACTUS_BODY}>
                         <meshStandardMaterial color="#228b22" roughness={0.8} />
                     </mesh>
                     {/* Arm Left */}
                     <mesh position={[-0.35, 0.2, 0]} rotation={[0, 0, 1.2]} geometry={CACTUS_ARM}>
                        <meshStandardMaterial color="#228b22" roughness={0.8} />
                     </mesh>
                     <mesh position={[-0.55, 0.5, 0]} geometry={CACTUS_ARM}>
                        <meshStandardMaterial color="#228b22" roughness={0.8} />
                     </mesh>
                     {/* Arm Right */}
                     <mesh position={[0.35, -0.1, 0]} rotation={[0, 0, -1.2]} geometry={CACTUS_ARM}>
                        <meshStandardMaterial color="#228b22" roughness={0.8} />
                     </mesh>
                     <mesh position={[0.55, 0.2, 0]} geometry={CACTUS_ARM}>
                        <meshStandardMaterial color="#228b22" roughness={0.8} />
                     </mesh>
                     
                     {/* Spikes/Glow for danger */}
                     <pointLight color="red" distance={1.5} intensity={1.0} />
                </group>
            )}

            {/* --- GEM --- */}
            {data.type === ObjectType.GEM && (
                <mesh geometry={GEM_GEOMETRY} position={[0, 0, 0]}>
                    <meshStandardMaterial 
                        color={data.color} 
                        roughness={0} 
                        metalness={1} 
                        emissive={data.color} 
                        emissiveIntensity={2} 
                    />
                </mesh>
            )}

            {/* --- LETTER --- */}
            {data.type === ObjectType.LETTER && (
                 <group>
                    <Center>
                        <Text3D 
                            font={FONT_URL} 
                            size={1.0} 
                            height={0.2}
                            curveSegments={8}
                            bevelEnabled
                            bevelSize={0.02}
                            bevelThickness={0.05}
                        >
                            {data.letterChar}
                            <meshStandardMaterial 
                                color="#ffcc00" 
                                emissive="#ffcc00"
                                emissiveIntensity={1.0}
                                metalness={1}
                                roughness={0}
                            />
                        </Text3D>
                    </Center>
                     <pointLight distance={3} intensity={2} color="#ffcc00" />
                 </group>
            )}
        </group>
    );
});
