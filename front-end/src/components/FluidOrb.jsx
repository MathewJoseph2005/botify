import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, MeshDistortMaterial } from '@react-three/drei';

function OrbMesh() {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.1;
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, -1, 0]}>
      <sphereGeometry args={[2.5, 90, 64]} />
      <MeshDistortMaterial
        color="#2e2d2dff"
        envMapIntensity={2.5}
        clearcoat={1}
        clearcoatRoughness={0.1}
        metalness={1}
        roughness={0.2}
        distort={0.4}
        speed={1.5}
        iridescence={1}
        iridescenceIOR={1.5}
        iridescenceThicknessRange={[100, 400]}
      />
    </mesh>
  );
}

export default function FluidOrb() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={2.5} color="#000000ff" />
        <directionalLight position={[-10, 10, -5]} intensity={2} color="#5c2062ff" />
        <directionalLight position={[0, -10, 5]} intensity={1.5} color="#30272dff" />
        <OrbMesh />
        <Environment preset="night" />
      </Canvas>
    </div>
  );
}

