'use client';

import { useEffect, useRef, useState } from 'react';
import { Operation } from '@/lib/stellar';

interface TransactionFlowAnimationProps {
    operations: Operation[];
    height?: number;
}

interface Particle {
    id: string;
    progress: number;
    speed: number;
    type: string;
    color: string;
    trail: { x: number; y: number }[];
    alive: boolean;
    stage: number; // 0: wallet->validator, 1: paused at validator, 2: validator->ledger
    walletIndex: number;
    validatorIndex: number;
    pauseTimer: number;
}

const colors: Record<string, string> = {
    payment: '#10b981',
    swap: '#8b5cf6',
    contract: '#f59e0b',
    trustline: '#14b8a6',
    other: '#64748b'
};

function getOperationType(type: string): string {
    if (type === 'payment' || type === 'create_account') return 'payment';
    if (type.includes('path_payment') || type.includes('offer')) return 'swap';
    if (type === 'invoke_host_function') return 'contract';
    if (type === 'change_trust') return 'trustline';
    return 'other';
}

// Quadratic bezier point calculation
function getQuadraticBezierPoint(
    t: number,
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number }
): { x: number; y: number } {
    const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
    const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
    return { x, y };
}

export default function TransactionFlowAnimation({
    operations,
    height = 340
}: TransactionFlowAnimationProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const lastOperationIdRef = useRef<string>('');
    const animationRef = useRef<number>();
    const spawnTimerRef = useRef<number>(0);
    const operationQueueRef = useRef<Operation[]>([]);
    const processedCountRef = useRef<number>(0);
    const [processedCount, setProcessedCount] = useState(0);
    const [dimensions, setDimensions] = useState({ width: 800, height });

    // Update dimensions on resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height
                });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [height]);

    // Queue up operations when they arrive
    useEffect(() => {
        if (operations.length === 0) return;

        const newOps = operations.filter(op => {
            if (!lastOperationIdRef.current) return true;
            return op.id > lastOperationIdRef.current;
        });

        if (newOps.length > 0) {
            lastOperationIdRef.current = operations[0].id;
            operationQueueRef.current = [...operationQueueRef.current, ...newOps].slice(-100);
        }
    }, [operations]);

    // Initialize with particles already in motion
    useEffect(() => {
        const types = ['payment', 'swap', 'contract', 'trustline', 'contract', 'payment', 'swap', 'contract'];

        for (let i = 0; i < 15; i++) {
            const opType = types[i % types.length];
            const walletIndex = Math.floor(Math.random() * 5);
            const validatorIndex = Math.floor(Math.random() * 4);
            const stage = Math.floor(Math.random() * 3);

            particlesRef.current.push({
                id: `init-${i}`,
                progress: Math.random() * 0.9,
                speed: 0.006 + Math.random() * 0.004,
                type: opType,
                color: colors[opType],
                trail: [],
                alive: true,
                stage,
                walletIndex,
                validatorIndex,
                pauseTimer: stage === 1 ? Math.floor(Math.random() * 30) : 0
            });
        }
    }, []);

    // Animation loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width } = dimensions;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        // Node positions - 5 wallets, 4 validators, 1 ledger
        const wallets = [];
        for (let i = 0; i < 5; i++) {
            wallets.push({
                x: 80,
                y: 50 + i * ((height - 100) / 4),
                label: `Wallet ${i + 1}`
            });
        }

        const validators = [];
        for (let i = 0; i < 4; i++) {
            validators.push({
                x: width * 0.5,
                y: 70 + i * ((height - 140) / 3),
                label: `Validator ${i + 1}`
            });
        }

        const ledger = { x: width - 100, y: height / 2, label: 'Ledger' };

        function drawNode(
            x: number, y: number, size: number,
            type: 'wallet' | 'validator' | 'ledger',
            label: string
        ) {
            // Outer glow (subtle for white mode)
            const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5);
            const glowColor = type === 'ledger' ? '#0ea5e9' : type === 'validator' ? '#8b5cf6' : '#94a3b8';
            glow.addColorStop(0, glowColor + '20');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Node body
            const gradient = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, 0, x, y, size);
            if (type === 'ledger') {
                gradient.addColorStop(0, '#38bdf8');
                gradient.addColorStop(1, '#0ea5e9');
            } else if (type === 'validator') {
                gradient.addColorStop(0, '#a78bfa');
                gradient.addColorStop(1, '#8b5cf6');
            } else {
                gradient.addColorStop(0, '#e2e8f0');
                gradient.addColorStop(1, '#cbd5e1');
            }
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();

            // Border
            ctx.strokeStyle = type === 'ledger' ? '#0ea5e9' : type === 'validator' ? '#8b5cf6' : '#94a3b8';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Icon inside node
            ctx.font = `${size * 0.7}px -apple-system, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (type === 'ledger') {
                // Hexagon icon
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${size * 0.6}px -apple-system`;
                ctx.fillText('⬡', x, y);
            } else if (type === 'validator') {
                // Diamond icon
                ctx.fillStyle = '#ffffff';
                ctx.font = `${size * 0.5}px -apple-system`;
                ctx.fillText('◆', x, y);
            } else {
                // Dot for wallet (darker for light background)
                ctx.fillStyle = '#64748b';
                ctx.beginPath();
                ctx.arc(x, y, size * 0.25, 0, Math.PI * 2);
                ctx.fill();
            }

            // Label below node
            ctx.fillStyle = '#64748b';
            ctx.font = '500 11px -apple-system, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(label, x, y + size + 8);
        }

        function drawConnections() {
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);

            // Wallets to validators
            wallets.forEach(wallet => {
                validators.forEach(validator => {
                    const controlPoint = {
                        x: (wallet.x + validator.x) / 2,
                        y: wallet.y
                    };
                    ctx.beginPath();
                    ctx.moveTo(wallet.x, wallet.y);
                    ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, validator.x, validator.y);
                    ctx.stroke();
                });
            });

            // Validators to ledger
            validators.forEach(validator => {
                const controlPoint = {
                    x: (validator.x + ledger.x) / 2,
                    y: validator.y
                };
                ctx.beginPath();
                ctx.moveTo(validator.x, validator.y);
                ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, ledger.x, ledger.y);
                ctx.stroke();
            });

            ctx.setLineDash([]);
        }

        function spawnParticle() {
            let opType: string;
            let id: string;

            if (operationQueueRef.current.length > 0) {
                const op = operationQueueRef.current.shift()!;
                opType = getOperationType(op.type);
                id = op.id;
            } else {
                const rand = Math.random();
                if (rand < 0.4) opType = 'contract';
                else if (rand < 0.6) opType = 'payment';
                else if (rand < 0.8) opType = 'swap';
                else opType = 'trustline';
                id = `auto-${Date.now()}-${Math.random()}`;
            }

            const walletIndex = Math.floor(Math.random() * 5);
            const validatorIndex = Math.floor(Math.random() * 4);

            particlesRef.current.push({
                id,
                progress: 0,
                speed: 0.006 + Math.random() * 0.004,
                type: opType,
                color: colors[opType],
                trail: [],
                alive: true,
                stage: 0,
                walletIndex,
                validatorIndex,
                pauseTimer: 0
            });
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);

            // Spawn particles
            spawnTimerRef.current++;
            if (spawnTimerRef.current >= 12) {
                spawnParticle();
                spawnTimerRef.current = 0;
            }

            // Draw connections first (behind everything)
            drawConnections();

            // Draw nodes
            wallets.forEach(w => drawNode(w.x, w.y, 22, 'wallet', w.label));
            validators.forEach(v => drawNode(v.x, v.y, 28, 'validator', v.label));
            drawNode(ledger.x, ledger.y, 40, 'ledger', ledger.label);

            // Update and draw particles
            particlesRef.current = particlesRef.current.filter(p => p.alive);

            particlesRef.current.forEach(particle => {
                let currentPos: { x: number; y: number };
                const wallet = wallets[particle.walletIndex];
                const validator = validators[particle.validatorIndex];

                if (particle.stage === 0) {
                    // Wallet to Validator
                    particle.progress += particle.speed;
                    const controlPoint = { x: (wallet.x + validator.x) / 2, y: wallet.y };

                    if (particle.progress >= 1) {
                        particle.stage = 1;
                        particle.progress = 0;
                        particle.pauseTimer = 40 + Math.floor(Math.random() * 20); // Pause 40-60 frames
                        currentPos = { x: validator.x, y: validator.y };
                    } else {
                        currentPos = getQuadraticBezierPoint(particle.progress, wallet, controlPoint, validator);
                    }
                } else if (particle.stage === 1) {
                    // Paused at validator
                    currentPos = { x: validator.x, y: validator.y };
                    particle.pauseTimer--;

                    if (particle.pauseTimer <= 0) {
                        particle.stage = 2;
                        particle.progress = 0;
                        particle.trail = [];
                    }
                } else {
                    // Validator to Ledger
                    particle.progress += particle.speed;
                    const controlPoint = { x: (validator.x + ledger.x) / 2, y: validator.y };

                    if (particle.progress >= 1) {
                        particle.alive = false;
                        processedCountRef.current++;
                        if (processedCountRef.current % 5 === 0) {
                            setProcessedCount(processedCountRef.current);
                        }
                        return;
                    } else {
                        currentPos = getQuadraticBezierPoint(particle.progress, validator, controlPoint, ledger);
                    }
                }

                // Trail (don't draw trail when paused)
                if (particle.stage !== 1) {
                    particle.trail.push({ x: currentPos.x, y: currentPos.y });
                    if (particle.trail.length > 15) particle.trail.shift();
                }

                // Draw trail
                if (particle.trail.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
                    for (let i = 1; i < particle.trail.length; i++) {
                        ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
                    }
                    const gradient = ctx.createLinearGradient(
                        particle.trail[0].x, particle.trail[0].y,
                        currentPos.x, currentPos.y
                    );
                    gradient.addColorStop(0, 'transparent');
                    gradient.addColorStop(1, particle.color);
                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    ctx.stroke();
                }

                // Glow
                const glowSize = particle.stage === 1 ? 14 : 12;
                const glow = ctx.createRadialGradient(currentPos.x, currentPos.y, 0, currentPos.x, currentPos.y, glowSize);
                glow.addColorStop(0, particle.color + '60');
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(currentPos.x, currentPos.y, glowSize, 0, Math.PI * 2);
                ctx.fill();

                // Particle
                const particleSize = particle.stage === 1 ? 6 : 5;
                ctx.fillStyle = particle.color;
                ctx.beginPath();
                ctx.arc(currentPos.x, currentPos.y, particleSize, 0, Math.PI * 2);
                ctx.fill();

                // Highlight
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(currentPos.x - 1, currentPos.y - 1, 1.5, 0, Math.PI * 2);
                ctx.fill();
            });

            animationRef.current = requestAnimationFrame(animate);
        }

        animate();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [dimensions, height]);

    return (
        <div
            ref={containerRef}
            className="relative w-full rounded-2xl overflow-hidden border border-slate-200"
            style={{
                height,
                background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
            }}
        >
            <canvas ref={canvasRef} className="w-full h-full" />

            {/* Stats overlay - top right */}
            <div className="absolute top-3 right-4 flex items-center gap-6 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-200">
                <div className="text-center">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Processed</div>
                    <div className="text-lg font-bold text-sky-500">{processedCount.toLocaleString()}</div>
                </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-3 right-4 flex items-center gap-4 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-200">
                {[
                    { type: 'payment', label: 'Payment' },
                    { type: 'swap', label: 'Swap' },
                    { type: 'contract', label: 'Contract' },
                    { type: 'trustline', label: 'Trust' }
                ].map(item => (
                    <div key={item.type} className="flex items-center gap-1.5">
                        <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: colors[item.type] }}
                        />
                        <span className="text-[10px] text-slate-600 font-medium">{item.label}</span>
                    </div>
                ))}
            </div>

            {/* Title */}
            <div className="absolute top-3 left-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    Live Transaction Flow
                </span>
            </div>
        </div>
    );
}
