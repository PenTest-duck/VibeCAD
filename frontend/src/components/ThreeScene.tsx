import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { group } from 'console';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const ThreeScene: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.0001, 200000 );
      camera.position.set(0, 0, 100);
      const renderer = new THREE.WebGLRenderer();
      renderer.setSize(window.innerWidth, window.innerHeight);
      containerRef.current?.appendChild(renderer.domElement);
      const controls = new OrbitControls(camera, renderer.domElement);

      const loader = new GLTFLoader();

      loader.load( 'sketch.glb', function ( gltf ) {

        scene.add( gltf.scene );

      }, undefined, function ( error ) {

        console.error( error );

      } );

      function animate() {

        controls.update();
        renderer.render(scene, camera);
      }

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      // Add directional light for better depth perception
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 10, 10);
      scene.add(directionalLight);

      renderer.setAnimationLoop( animate );
  }
}, []);

  return <div ref={containerRef} />;
};

export default ThreeScene;