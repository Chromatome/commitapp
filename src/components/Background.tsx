import React, { useRef, useEffect } from 'react';
import '../styles/styles.css';

type CanvasStrokeStyle = string | CanvasGradient | CanvasPattern;

interface GridOffset {
  x: number;
  y: number;
}

interface ShapeGridProps {
  direction?: 'diagonal' | 'up' | 'right' | 'down' | 'left';
  speed?: number;
  borderColor?: CanvasStrokeStyle;
  squareSize?: number;
  hoverFillColor?: CanvasStrokeStyle;
  shape?: 'square' | 'hexagon' | 'circle' | 'triangle';
  hoverTrailAmount?: number;
}

const ShapeGrid: React.FC<ShapeGridProps> = ({
  direction = 'right',
  speed = 1,
  borderColor = '#999',
  squareSize = 60,
  hoverFillColor = '#222',
  shape = 'square',
  hoverTrailAmount = 0
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const numSquaresX = useRef<number>(0);
  const numSquaresY = useRef<number>(0);
  const gridOffset = useRef<GridOffset>({ x: 0, y: 0 });
  const hoveredSquareRef = useRef<GridOffset | null>(null);
  const trailCells = useRef<GridOffset[]>([]);
  const cellOpacities = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const isHex = shape === 'hexagon';
    const isTri = shape === 'triangle';
    const hexHoriz = squareSize * 1.5;
    const hexVert = squareSize * Math.sqrt(3);

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      numSquaresX.current = Math.ceil(canvas.width / squareSize) + 1;
      numSquaresY.current = Math.ceil(canvas.height / squareSize) + 1;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const drawHex = (cx: number, cy: number, size: number) => {
      if (!ctx) return;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const vx = cx + size * Math.cos(angle);
        const vy = cy + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
    };

    const drawCircle = (cx: number, cy: number, size: number) => {
      if (!ctx) return;
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      ctx.closePath();
    };

    const drawTriangle = (cx: number, cy: number, size: number, flip: boolean) => {
      if (!ctx) return;
      ctx.beginPath();
      if (flip) {
        ctx.moveTo(cx, cy + size / 2);
        ctx.lineTo(cx + size / 2, cy - size / 2);
        ctx.lineTo(cx - size / 2, cy - size / 2);
      } else {
        ctx.moveTo(cx, cy - size / 2);
        ctx.lineTo(cx + size / 2, cy + size / 2);
        ctx.lineTo(cx - size / 2, cy + size / 2);
      }
      ctx.closePath();
    };

    const drawGrid = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const hue = (performance.now() / 20) % 360;
      const nativeRainbowColor = `hsl(${hue}, 85%, 90%)`;

      if (isHex) {
        const cols = Math.ceil(canvas.width / hexHoriz) + 3;
        const rows = Math.ceil(canvas.height / hexVert) + 3;
        const startCol = Math.floor(-gridOffset.current.x / hexHoriz) - 2;
        const startRow = Math.floor(-gridOffset.current.y / hexVert) - 2;

        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            const col = startCol + i;
            const row = startRow + j;
            const rowOffset = Math.abs(col % 2) === 1 ? hexVert / 2 : 0;
            
            const cx = col * hexHoriz + gridOffset.current.x;
            const cy = row * hexVert + rowOffset + gridOffset.current.y;

            const cellKey = `${col},${row}`;
            const alpha = cellOpacities.current.get(cellKey);
            
            if (alpha) {
              ctx.globalAlpha = alpha;
              drawHex(cx, cy, squareSize);
              ctx.fillStyle = nativeRainbowColor;
              ctx.fill();
              ctx.globalAlpha = 1;
            }

            drawHex(cx, cy, squareSize);
            ctx.strokeStyle = borderColor;
            ctx.stroke();
          }
        }
      } else if (isTri) {
        const halfW = squareSize / 2;
        const cols = Math.ceil(canvas.width / halfW) + 4;
        const rows = Math.ceil(canvas.height / squareSize) + 4;
        const startCol = Math.floor(-gridOffset.current.x / halfW) - 2;
        const startRow = Math.floor(-gridOffset.current.y / squareSize) - 2;

        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            const col = startCol + i;
            const row = startRow + j;
            
            const cx = col * halfW + gridOffset.current.x;
            const cy = row * squareSize + squareSize / 2 + gridOffset.current.y;
            const flip = Math.abs((col + row) % 2) === 1;

            const cellKey = `${col},${row}`;
            const alpha = cellOpacities.current.get(cellKey);
            
            if (alpha) {
              ctx.globalAlpha = alpha;
              drawTriangle(cx, cy, squareSize, flip);
              ctx.fillStyle = nativeRainbowColor;
              ctx.fill();
              ctx.globalAlpha = 1;
            }

            drawTriangle(cx, cy, squareSize, flip);
            ctx.strokeStyle = borderColor;
            ctx.stroke();
          }
        }
      } else if (shape === 'circle') {
        const cols = Math.ceil(canvas.width / squareSize) + 3;
        const rows = Math.ceil(canvas.height / squareSize) + 3;
        const startCol = Math.floor(-gridOffset.current.x / squareSize) - 2;
        const startRow = Math.floor(-gridOffset.current.y / squareSize) - 2;

        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            const col = startCol + i;
            const row = startRow + j;
            
            const cx = col * squareSize + squareSize / 2 + gridOffset.current.x;
            const cy = row * squareSize + squareSize / 2 + gridOffset.current.y;

            const cellKey = `${col},${row}`;
            const alpha = cellOpacities.current.get(cellKey);
            
            if (alpha) {
              ctx.globalAlpha = alpha;
              drawCircle(cx, cy, squareSize);
              ctx.fillStyle = nativeRainbowColor;
              ctx.fill();
              ctx.globalAlpha = 1;
            }

            drawCircle(cx, cy, squareSize);
            ctx.strokeStyle = borderColor;
            ctx.stroke();
          }
        }
      } else {
        const cols = Math.ceil(canvas.width / squareSize) + 3;
        const rows = Math.ceil(canvas.height / squareSize) + 3;
        const startCol = Math.floor(-gridOffset.current.x / squareSize) - 2;
        const startRow = Math.floor(-gridOffset.current.y / squareSize) - 2;

        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            const col = startCol + i;
            const row = startRow + j;
            
            const sx = col * squareSize + gridOffset.current.x;
            const sy = row * squareSize + gridOffset.current.y;

            const cellKey = `${col},${row}`;
            const alpha = cellOpacities.current.get(cellKey);
            
            if (alpha) {
              ctx.globalAlpha = alpha;
              ctx.fillStyle = nativeRainbowColor;
              ctx.fillRect(sx, sy, squareSize, squareSize);
              ctx.globalAlpha = 1;
            }

            ctx.strokeStyle = borderColor;
            ctx.strokeRect(sx, sy, squareSize, squareSize);
          }
        }
      }
    };

    const updateAnimation = () => {
      const effectiveSpeed = Math.max(speed, 0.1);

      // Removed modulo wrapping entirely. We let the numbers grow infinitely.
      switch (direction) {
        case 'right':
          gridOffset.current.x -= effectiveSpeed;
          break;
        case 'left':
          gridOffset.current.x += effectiveSpeed;
          break;
        case 'up':
          gridOffset.current.y += effectiveSpeed;
          break;
        case 'down':
          gridOffset.current.y -= effectiveSpeed;
          break;
        case 'diagonal':
          gridOffset.current.x -= effectiveSpeed;
          gridOffset.current.y -= effectiveSpeed;
          break;
        default:
          break;
      }

      updateCellOpacities();
      drawGrid();
      requestRef.current = requestAnimationFrame(updateAnimation);
    };

    const updateCellOpacities = () => {
      const targets = new Map<string, number>();

      if (hoveredSquareRef.current) {
        targets.set(`${hoveredSquareRef.current.x},${hoveredSquareRef.current.y}`, 1);
      }

      if (hoverTrailAmount > 0) {
        for (let i = 0; i < trailCells.current.length; i++) {
          const t = trailCells.current[i];
          const key = `${t.x},${t.y}`;
          if (!targets.has(key)) {
            targets.set(key, (trailCells.current.length - i) / (trailCells.current.length + 1));
          }
        }
      }

      for (const [key] of targets) {
        if (!cellOpacities.current.has(key)) {
          cellOpacities.current.set(key, 0);
        }
      }

      for (const [key, opacity] of cellOpacities.current) {
        const target = targets.get(key) || 0;
        
        // Fast fade-in, slow fade-out (assuming fadeRate = 0.05 from previous edits)
        const isFadingIn = target > opacity;
        const currentRate = isFadingIn ? 0.8 : 0.02; 
        
        const next = opacity + (target - opacity) * currentRate;
        if (next < 0.005) {
          cellOpacities.current.delete(key);
        } else {
          cellOpacities.current.set(key, next);
        }
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      // Mouse coordinates relative to the infinite world
      const worldX = (event.clientX - rect.left) - gridOffset.current.x;
      const worldY = (event.clientY - rect.top) - gridOffset.current.y;

      let col = 0;
      let row = 0;

      if (isHex) {
        col = Math.round(worldX / hexHoriz);
        const rowOffset = Math.abs(col % 2) === 1 ? hexVert / 2 : 0;
        row = Math.round((worldY - rowOffset) / hexVert);
      } else if (isTri) {
        const halfW = squareSize / 2;
        col = Math.round(worldX / halfW);
        row = Math.floor(worldY / squareSize);
      } else if (shape === 'circle') {
        col = Math.round(worldX / squareSize);
        row = Math.round(worldY / squareSize);
      } else {
        col = Math.floor(worldX / squareSize);
        row = Math.floor(worldY / squareSize);
      }

      if (!hoveredSquareRef.current || hoveredSquareRef.current.x !== col || hoveredSquareRef.current.y !== row) {
        if (hoveredSquareRef.current && hoverTrailAmount > 0) {
          trailCells.current.unshift({ ...hoveredSquareRef.current });
          if (trailCells.current.length > hoverTrailAmount) trailCells.current.length = hoverTrailAmount;
        }
        hoveredSquareRef.current = { x: col, y: row };
      }
    };

    const handleMouseLeave = () => {
      if (hoveredSquareRef.current && hoverTrailAmount > 0) {
        trailCells.current.unshift({ ...hoveredSquareRef.current });
        if (trailCells.current.length > hoverTrailAmount) trailCells.current.length = hoverTrailAmount;
      }
      hoveredSquareRef.current = null;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    requestRef.current = requestAnimationFrame(updateAnimation);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [direction, speed, borderColor, hoverFillColor, squareSize, shape, hoverTrailAmount]); // Add fadeRate here if you made it a prop!

  return <canvas ref={canvasRef} className="shapegrid-canvas"></canvas>;
};

export default ShapeGrid;
