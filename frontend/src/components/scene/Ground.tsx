export function Ground({ size = 50 }: { size?: number }) {
  return (
    <group>
      {/* Soft shadow-catcher plane with sky-reflecting tint */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#e8f4f8" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* Grid helper slightly above to avoid z-fight */}
      <gridHelper args={[size, size, "#999", "#ddd"]} position={[0, 0.01, 0]} />
      <axesHelper args={[2]} />
    </group>
  );
}
