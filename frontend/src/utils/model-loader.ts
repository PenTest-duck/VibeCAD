import * as THREE from "three";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

export async function loadModelFromFile(file: File): Promise<THREE.Object3D> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext) throw new Error("File must have an extension");

  const arrayBuffer = await file.arrayBuffer();

  switch (ext) {
    case "glb":
    case "gltf": {
      const loader = new GLTFLoader();
      return await new Promise((resolve, reject) => {
        loader.parse(
          arrayBuffer,
          "",
          (gltf) => {
            const scene = gltf.scene || new THREE.Group();
            resolve(scene);
          },
          (err) => reject(err)
        );
      });
    }
    case "stl": {
      const loader = new STLLoader();
      return await new Promise((resolve, reject) => {
        try {
          const geometry = loader.parse(arrayBuffer);
          const material = new THREE.MeshStandardMaterial({ 
            color: 0xaaaaaa,
            roughness: 0.5,
            metalness: 0.5
          });
          const mesh = new THREE.Mesh(geometry, material);
          resolve(mesh);
        } catch (err) {
          reject(err);
        }
      });
    }
    case "obj": {
      const loader = new OBJLoader();
      return await new Promise((resolve, reject) => {
        try {
          const text = new TextDecoder().decode(arrayBuffer);
          const object = loader.parse(text);
          // Apply default material to OBJ meshes
          object.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0xaaaaaa,
                roughness: 0.5,
                metalness: 0.5
              });
            }
          });
          resolve(object);
        } catch (err) {
          reject(err);
        }
      });
    }
    default:
      throw new Error(`Unsupported file type: .${ext}. Supported formats: GLB, GLTF, STL, OBJ`);
  }
}

export async function loadModelById(modelId: string): Promise<THREE.Object3D> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      throw new Error('NEXT_PUBLIC_BACKEND_URL environment variable is not set');
    }
    
    const response = await fetch(`${backendUrl}/stl/${modelId}.stl`);
    if (!response.ok) {
      throw new Error(`Failed to load model: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const file = new File([blob], `${modelId}.stl`, { type: 'application/octet-stream' });
    return await loadModelFromFile(file);
  } catch (error) {
    console.error('Error loading model by ID:', error);
    throw error;
  }
}
