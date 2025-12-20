import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { GameState, ServiceType, Position, TrafficRequest, TrafficType } from '../types';
import { TRAFFIC_INFO } from '../types';
import { gameApi } from '../api';


interface GameCanvasProps {
  gameState: GameState;
  activeTraffic: TrafficRequest[];
  selectedService: ServiceType | null;
  selectedTool: 'connect' | 'delete' | null;
  onServicePlaced: () => void;
  onCancel: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  activeTraffic,
  selectedService,
  selectedTool,
  onServicePlaced,
  onCancel
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  
  // State for connection tool
  const [firstSelectedService, setFirstSelectedService] = useState<string | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 15, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Grid
    const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Ground plane for raycasting
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    groundGeometry.rotateX(-Math.PI / 2);
    const groundMaterial = new THREE.MeshBasicMaterial({ 
      visible: false 
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.name = 'ground';
    scene.add(ground);

    // Traffic spawn point indicator
    const GRID_SIZE = 2;
    const spawnGeometry = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
    const spawnMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const spawnSquare = new THREE.Mesh(spawnGeometry, spawnMaterial);
    spawnSquare.position.set(0, 0.05, 0); // Slightly above ground to avoid z-fighting
    spawnSquare.rotation.x = -Math.PI / 2; // Rotate to lay flat
    scene.add(spawnSquare);

    // Add border for spawn square
    const spawnEdges = new THREE.EdgesGeometry(spawnGeometry);
    const spawnLine = new THREE.LineSegments(
      spawnEdges,
      new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 })
    );
    spawnLine.position.copy(spawnSquare.position);
    spawnLine.rotation.copy(spawnSquare.rotation);
    scene.add(spawnLine);

    // Add "INTERNET" label
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;
    context.fillStyle = '#ff0000';
    context.font = 'bold 32px Arial';
    context.textAlign = 'center';
    context.fillText('INTERNET', 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const labelGeometry = new THREE.PlaneGeometry(2.5, 0.6);
    const labelMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.set(0, 0.1, -GRID_SIZE / 2 - 1.5);
    scene.add(label);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Reset first selected service when tool changes
  useEffect(() => {
    if (selectedTool !== 'connect') {
      setFirstSelectedService(null);
    }
  }, [selectedTool]);

  // Handle canvas clicks for service placement, connection, and deletion
  useEffect(() => {
    if (!containerRef.current || !rendererRef.current) return;

    const canvas = rendererRef.current.domElement;

    const handleClick = async (event: MouseEvent) => {
      if (!sceneRef.current || !cameraRef.current) return;

      // Calculate mouse position in normalized device coordinates
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Raycast to find intersections
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      
      // Check for service clicks first
      const serviceMeshes = sceneRef.current.children.filter(
        child => child.userData.isService
      );
      const serviceIntersects = raycasterRef.current.intersectObjects(serviceMeshes);

      // CONNECT TOOL
      if (selectedTool === 'connect') {
        if (serviceIntersects.length > 0) {
          const clickedServiceId = serviceIntersects[0].object.userData.serviceId;
          
          if (!firstSelectedService) {
            // First click - select source service
            setFirstSelectedService(clickedServiceId);
            console.log('🔗 Selected source service:', clickedServiceId);
          } else {
            // Second click - connect to target service
            if (clickedServiceId !== firstSelectedService) {
              try {
                console.log(`🔗 Connecting ${firstSelectedService} → ${clickedServiceId}`);
                await gameApi.connectServices(
                  gameState.gameId,
                  firstSelectedService,
                  clickedServiceId
                );
                console.log('✅ Services connected successfully');
                setFirstSelectedService(null);
                onServicePlaced(); // Refresh state
              } catch (error) {
                console.error('❌ Failed to connect services:', error);
                alert(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
                setFirstSelectedService(null);
              }
            } else {
              console.log('⚠️ Cannot connect service to itself');
              setFirstSelectedService(null);
            }
          }
        }
        return;
      }

      // DELETE TOOL
      if (selectedTool === 'delete') {
        if (serviceIntersects.length > 0) {
          const serviceId = serviceIntersects[0].object.userData.serviceId;
          const serviceType = serviceIntersects[0].object.userData.serviceType;
          
          if (confirm(`Delete ${serviceType} (50% refund)?`)) {
            try {
              console.log(`🗑️ Deleting service: ${serviceId}`);
              await gameApi.removeService(gameState.gameId, serviceId);
              console.log('✅ Service deleted successfully');
              onServicePlaced(); // Refresh state
            } catch (error) {
              console.error('❌ Failed to delete service:', error);
              alert(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
        return;
      }

      // SERVICE PLACEMENT
      if (selectedService) {
        const ground = sceneRef.current.getObjectByName('ground');
        if (!ground) return;

        const groundIntersects = raycasterRef.current.intersectObject(ground);
        if (groundIntersects.length > 0) {
          const point = groundIntersects[0].point;
          const position: Position = {
            x: Math.round(point.x),
            y: 0,
            z: Math.round(point.z)
          };

          console.log(`🏗️ Placing ${selectedService} at:`, position);

          try {
            await gameApi.placeService(
              gameState.gameId, 
              selectedService, 
              position
            );
            console.log('✅ Service placed successfully');
            onServicePlaced();
          } catch (error) {
            console.error('❌ Failed to place service:', error);
            alert(`Failed to place service: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      setFirstSelectedService(null);
      onCancel();
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [selectedService, selectedTool, firstSelectedService, gameState.gameId, onServicePlaced, onCancel]);

  // Render services and connections from game state
  useEffect(() => {
    if (!sceneRef.current || !gameState.services) return;

    // Remove old service meshes and connection lines
    const objectsToRemove = sceneRef.current.children.filter(
      child => child.userData.isService || child.userData.isConnection || child.userData.isSpawnConnection
    );
    objectsToRemove.forEach(obj => sceneRef.current!.remove(obj));

    // Add new service meshes
    const services = gameState.services 
      ? Object.values(gameState.services)
      : [];

    // Service color map (from README.md)
    const colorMap: Record<string, number> = {
      WAF: 0xff4444,      // Red - Firewall
      SQS: 0xff8800,      // Orange - Queue
      ALB: 0x8844ff,      // Purple - Load Balancer
      COMPUTE: 0x4488ff,  // Blue - EC2
      CACHE: 0x44ff88,    // Green - Redis
      DATABASE: 0x4444ff, // Dark Blue - RDS
      S3: 0xffaa00        // Yellow - Storage
    };

    // Create service meshes
    const serviceMeshMap = new Map<string, THREE.Mesh>();

    services.forEach(service => {
      const geometry = new THREE.BoxGeometry(1, 1.5, 1);
      
      const color = colorMap[service.type] || 0x888888;
      const material = new THREE.MeshStandardMaterial({ 
        color,
        emissive: firstSelectedService === service.id ? 0x00ff00 : 0x000000,
        emissiveIntensity: firstSelectedService === service.id ? 0.5 : 0,
        transparent: true,
        opacity: service.health > 50 ? 1.0 : 0.7 // Visual indicator for damaged services
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      mesh.position.set(
        service.position.x,
        0.75, // Half height to sit on ground
        service.position.z
      );
      
      mesh.userData.isService = true;
      mesh.userData.serviceId = service.id;
      mesh.userData.serviceType = service.type;
      
      sceneRef.current!.add(mesh);
      serviceMeshMap.set(service.id, mesh);

      // Add health indicator ring
      if (service.health < 100) {
        const ringGeometry = new THREE.RingGeometry(0.7, 0.8, 32);
        const healthColor = service.health > 75 ? 0x44ff44 : service.health > 50 ? 0xffaa00 : 0xff4444;
        const ringMaterial = new THREE.MeshBasicMaterial({ 
          color: healthColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(service.position.x, 0.1, service.position.z);
        ring.userData.isService = true; // So it gets cleaned up
        sceneRef.current!.add(ring);
      }
    });

    // Find entry point services (services with no incoming connections)
    const servicesWithIncoming = new Set<string>();
    services.forEach(service => {
      if (service.connections && service.connections.length > 0) {
        service.connections.forEach(targetId => {
          servicesWithIncoming.add(targetId);
        });
      }
    });

    // Draw lines from spawn point to entry services
    const spawnPosition = new THREE.Vector3(0, 0.75, 0);
    services.forEach(service => {
      if (!servicesWithIncoming.has(service.id)) {
        // This is an entry point - draw line from spawn
        const servicePosition = new THREE.Vector3(
          service.position.x,
          0.75,
          service.position.z
        );

        const points = [spawnPosition, servicePosition];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        
        const lineMaterial = new THREE.LineBasicMaterial({
          color: 0xff6b6b, // Red color matching spawn square
          linewidth: 3,
          transparent: true,
          opacity: 0.7
        });

        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.userData.isSpawnConnection = true;
        line.userData.toServiceId = service.id;
        sceneRef.current!.add(line);

        // Add animated particles flowing from spawn to entry service
        const particleCount = 3;
        for (let i = 0; i < particleCount; i++) {
          const particleGeometry = new THREE.SphereGeometry(0.12, 8, 8);
          const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6b6b,
            transparent: true,
            opacity: 0.8
          });
          const particle = new THREE.Mesh(particleGeometry, particleMaterial);
          
          const progress = ((Date.now() % 3000) / 3000 + i / particleCount) % 1;
          particle.position.lerpVectors(spawnPosition, servicePosition, progress);
          particle.userData.isSpawnConnection = true;
          sceneRef.current!.add(particle);
        }

        // Add arrow at midpoint
        const midpoint = new THREE.Vector3().lerpVectors(spawnPosition, servicePosition, 0.5);
        const arrowGeometry = new THREE.ConeGeometry(0.2, 0.5, 8);
        const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff6b6b });
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        
        arrow.position.copy(midpoint);
        arrow.position.y += 0.3;
        arrow.lookAt(servicePosition);
        arrow.rotateX(Math.PI / 2);
        arrow.userData.isSpawnConnection = true;
        sceneRef.current!.add(arrow);
      }
    });

    // Draw connection lines between services
    services.forEach(service => {
      if (service.connections && service.connections.length > 0) {
        service.connections.forEach(targetId => {
          const targetService = gameState.services?.[targetId];
          if (!targetService) return;

          // Create line from source to target
          const points = [
            new THREE.Vector3(service.position.x, 0.75, service.position.z),
            new THREE.Vector3(targetService.position.x, 0.75, targetService.position.z)
          ];

          const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
          
          // Connection line color based on health of both services
          const avgHealth = (service.health + targetService.health) / 2;
          const lineColor = avgHealth > 75 ? 0x44ff44 : avgHealth > 50 ? 0xffaa00 : 0xff4444;
          
          const lineMaterial = new THREE.LineBasicMaterial({ 
            color: lineColor,
            linewidth: 2,
            transparent: true,
            opacity: 0.6
          });

          const line = new THREE.Line(lineGeometry, lineMaterial);
          line.userData.isConnection = true;
          line.userData.fromServiceId = service.id;
          line.userData.toServiceId = targetId;
          
          sceneRef.current!.add(line);

          // Add animated data flow particles
          const particleGeometry = new THREE.SphereGeometry(0.15, 8, 8);
          const particleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
          });
          const particle = new THREE.Mesh(particleGeometry, particleMaterial);
          
          // Animate particle along the line
          const progress = (Date.now() % 2000) / 2000; // 2 second loop
          particle.position.lerpVectors(points[0], points[1], progress);
          particle.userData.isConnection = true;
          
          sceneRef.current!.add(particle);

          // Add arrow indicator at midpoint
          const midpoint = new THREE.Vector3().lerpVectors(points[0], points[1], 0.5);
          
          const arrowGeometry = new THREE.ConeGeometry(0.2, 0.5, 8);
          const arrowMaterial = new THREE.MeshBasicMaterial({ color: lineColor });
          const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
          
          arrow.position.copy(midpoint);
          arrow.position.y += 0.3; // Lift arrow slightly above line
          arrow.lookAt(points[1]);
          arrow.rotateX(Math.PI / 2); // Point cone in direction of travel
          arrow.userData.isConnection = true;
          
          sceneRef.current!.add(arrow);
        });
      }
    });

    console.log('🎨 Rendered:', services.length, 'services with connections');
  }, [gameState.services, firstSelectedService]);

  // Animate traffic requests along service paths
  useEffect(() => {
    if (!sceneRef.current || !gameState.services || activeTraffic.length === 0) return;

    // Remove old traffic particles
    const oldTraffic = sceneRef.current.children.filter(
      child => child.userData.isTraffic
    );
    oldTraffic.forEach(obj => sceneRef.current!.remove(obj));

    // Create particles for active traffic
    activeTraffic.forEach(traffic => {
      if (!traffic.path || traffic.path.length < 2) return;

      // Find current segment based on elapsed time
      const elapsedMs = Date.now() - traffic.spawnTime;
      const segmentDuration = 1000; // 1 second per hop
      const currentSegmentIndex = Math.floor(elapsedMs / segmentDuration);
      
      if (currentSegmentIndex >= traffic.path.length - 1) return; // Completed

      const fromServiceId = traffic.path[currentSegmentIndex];
      const toServiceId = traffic.path[currentSegmentIndex + 1];
      
      const fromService = gameState.services[fromServiceId];
      const toService = gameState.services[toServiceId];
      
      if (!fromService || !toService) return;

      // Calculate position along segment
      const segmentProgress = (elapsedMs % segmentDuration) / segmentDuration;
      
      const fromPos = new THREE.Vector3(
        fromService.position.x,
        1.5, // Higher position for better visibility
        fromService.position.z
      );
      const toPos = new THREE.Vector3(
        toService.position.x,
        1.5,
        toService.position.z
      );

      // Create main traffic particle
      const geometry = new THREE.SphereGeometry(0.25, 16, 16);
      const trafficColor = TRAFFIC_INFO[traffic.type as TrafficType]?.color || '#ffffff';
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(trafficColor),
        transparent: true,
        opacity: 0.9
      });
      
      const particle = new THREE.Mesh(geometry, material);
      particle.position.lerpVectors(fromPos, toPos, segmentProgress);
      particle.userData.isTraffic = true;
      particle.userData.trafficId = traffic.id;
      
      sceneRef.current!.add(particle);

      // Add glowing ring for malicious traffic
      if (traffic.type === 'MALICIOUS') {
        const glowGeometry = new THREE.SphereGeometry(0.35, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.4
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(particle.position);
        glow.userData.isTraffic = true;
        sceneRef.current!.add(glow);
      }

      // Add trail effect for all traffic
      const trailGeometry = new THREE.SphereGeometry(0.15, 8, 8);
      const trailMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(trafficColor),
        transparent: true,
        opacity: 0.3
      });
      const trail = new THREE.Mesh(trailGeometry, trailMaterial);
      // Position trail slightly behind
      trail.position.lerpVectors(fromPos, toPos, Math.max(0, segmentProgress - 0.1));
      trail.userData.isTraffic = true;
      sceneRef.current!.add(trail);
    });

    if (activeTraffic.length > 0) {
      console.log('🚦 Rendering', activeTraffic.length, 'traffic particles');
    }
  }, [gameState.services, activeTraffic]);

  // Animation loop for smooth traffic movement
  useEffect(() => {
    if (!sceneRef.current || activeTraffic.length === 0) return;

    let animationFrame: number;

    const animate = () => {
      if (!sceneRef.current || !gameState.services) return;

      // Update traffic particle positions
      const trafficObjects = sceneRef.current.children.filter(
        child => child.userData.isTraffic
      );

      trafficObjects.forEach(obj => {
        const trafficId = obj.userData.trafficId;
        if (!trafficId) return;

        const traffic = activeTraffic.find(t => t.id === trafficId);
        if (!traffic || !traffic.path || traffic.path.length < 2) return;

        const elapsedMs = Date.now() - traffic.spawnTime;
        const segmentDuration = 1000;
        const currentSegmentIndex = Math.floor(elapsedMs / segmentDuration);
        
        if (currentSegmentIndex >= traffic.path.length - 1) return;

        const fromServiceId = traffic.path[currentSegmentIndex];
        const toServiceId = traffic.path[currentSegmentIndex + 1];
        
        const fromService = gameState.services[fromServiceId];
        const toService = gameState.services[toServiceId];
        
        if (!fromService || !toService) return;

        const segmentProgress = (elapsedMs % segmentDuration) / segmentDuration;
        
        const fromPos = new THREE.Vector3(
          fromService.position.x,
          1.5,
          fromService.position.z
        );
        const toPos = new THREE.Vector3(
          toService.position.x,
          1.5,
          toService.position.z
        );

        obj.position.lerpVectors(fromPos, toPos, segmentProgress);
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [gameState.services, activeTraffic]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        cursor: selectedService ? 'crosshair' : selectedTool === 'connect' ? 'pointer' : selectedTool === 'delete' ? 'not-allowed' : 'default',
        position: 'relative'
      }}
    >
      {selectedService && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 20px',
          background: 'rgba(76, 175, 80, 0.9)',
          color: 'white',
          borderRadius: '5px',
          zIndex: 1000,
          fontWeight: 'bold'
        }}>
          🏗️ Click to place {selectedService} | Right-click to cancel
        </div>
      )}
      
      {selectedTool === 'connect' && !firstSelectedService && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 20px',
          background: 'rgba(33, 150, 243, 0.9)',
          color: 'white',
          borderRadius: '5px',
          zIndex: 1000,
          fontWeight: 'bold'
        }}>
          🔗 Click first service to connect | Right-click to cancel
        </div>
      )}
      
      {selectedTool === 'connect' && firstSelectedService && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 20px',
          background: 'rgba(33, 150, 243, 0.9)',
          color: 'white',
          borderRadius: '5px',
          zIndex: 1000,
          fontWeight: 'bold'
        }}>
          🔗 Click second service to complete connection | Right-click to cancel
        </div>
      )}
      
      {selectedTool === 'delete' && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 20px',
          background: 'rgba(244, 67, 54, 0.9)',
          color: 'white',
          borderRadius: '5px',
          zIndex: 1000,
          fontWeight: 'bold'
        }}>
          🗑️ Click service to delete (50% refund) | Right-click to cancel
        </div>
      )}

      {/* Connection Legend */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        padding: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        borderRadius: '5px',
        fontSize: '0.85rem',
        zIndex: 1000
      }}>
        <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>🔗 Connection Health:</div>
        <div style={{ color: '#44ff44' }}>━━━ Healthy (75-100%)</div>
        <div style={{ color: '#ffaa00' }}>━━━ Degraded (50-75%)</div>
        <div style={{ color: '#ff4444' }}>━━━ Critical (&lt;50%)</div>
        <div style={{ marginTop: '5px', color: '#00ffff' }}>● Data Flow</div>
      </div>
    </div>
  );
};