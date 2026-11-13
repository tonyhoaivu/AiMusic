import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  barColor?: string;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  barColor = '#c084fc',
  className = 'w-full h-12',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phases = Array.from({ length: 32 }, () => Math.random() * Math.PI * 2);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const numBars = 32;
      const barWidth = (canvas.width / numBars) - 2;

      for (let i = 0; i < numBars; i++) {
        phases[i] += isPlaying ? 0.08 + (i % 3) * 0.02 : 0.01;
        const amplitude = isPlaying
          ? Math.sin(phases[i]) * 0.4 + 0.5 + Math.cos(i * 0.5) * 0.2
          : 0.1;
        const barHeight = Math.max(4, amplitude * canvas.height * 0.85);

        const x = i * (barWidth + 2);
        const y = (canvas.height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, barColor);
        gradient.addColorStop(1, '#06b6d4');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, barColor]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={48}
      className={`${className} rounded-lg bg-slate-900/40 backdrop-blur-xs`}
    />
  );
};
