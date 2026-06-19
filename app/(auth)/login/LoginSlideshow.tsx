'use client'

import { useState, useEffect } from "react";
import Image from "next/image";
import { BookOpen, GraduationCap, Award, Globe, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SLIDES = [
    {
        src: "/images/slide1.jpg",
        alt: "Your Learning Journey Starts Here",
    },
    {
        src: "/images/slide2.jpg",
        alt: "Welcome to EdHorizon",
    },
    {
        src: "/images/slide3.jpg",
        alt: "Education Reimagined",
    },
    {
        src: "/images/slide4.jpg",
        alt: "One World. One Classroom.",
    },
    {
        src: "/images/slide5.jpg",
        alt: "Your Future Starts Here",
    }
];

// Asynchronous floating parameters for the 5 glassmorphic icons
const FLOATING_ICONS = [
    { Icon: BookOpen, top: "12%", left: "10%", delay: 0, duration: 6, size: "h-10 w-10 text-indigo-200" },
    { Icon: GraduationCap, top: "22%", right: "12%", delay: 1, duration: 7, size: "h-11 w-11 text-indigo-300" },
    { Icon: Award, bottom: "28%", left: "8%", delay: 1.5, duration: 6.5, size: "h-10 w-10 text-amber-200" },
    { Icon: Globe, bottom: "18%", right: "15%", delay: 0.5, duration: 8, size: "h-10 w-10 text-sky-200" },
    { Icon: Cpu, top: "52%", left: "6%", delay: 2, duration: 7.5, size: "h-10 w-10 text-emerald-200" }
];

export default function LoginSlideshow() {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto rotate slides every 4 seconds as per spec
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
        }, 4000);

        return () => {
            clearInterval(timer);
        };
    }, []);

    const handleDotClick = (index: number) => {
        if (index === currentIndex) return;
        setCurrentIndex(index);
    };

    // Premium slide & fade variants (slides in from right to left, fades simultaneously)
    const slideVariants: any = {
        enter: {
            x: 40,
            opacity: 0,
            scale: 0.98
        },
        center: {
            x: 0,
            opacity: 1,
            scale: 1,
            transition: {
                x: { type: "spring" as const, stiffness: 220, damping: 26 },
                opacity: { duration: 0.65, ease: "easeInOut" },
                scale: { duration: 0.65, ease: "easeInOut" }
            }
        },
        exit: {
            x: -40,
            opacity: 0,
            scale: 0.98,
            transition: {
                x: { type: "spring" as const, stiffness: 220, damping: 26 },
                opacity: { duration: 0.5, ease: "easeInOut" },
                scale: { duration: 0.5, ease: "easeInOut" }
            }
        }
    };

    return (
        <div className="relative h-full w-full overflow-hidden bg-gradient-to-tr from-slate-950 via-[#0c0f18] to-slate-900 select-none flex flex-col justify-between p-6">
            
            {/* Ambient colored background blur that changes dynamically */}
            <div className="absolute inset-0 z-0">
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.35 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2 }}
                        className="absolute inset-0 h-full w-full"
                    >
                        <Image
                            src={SLIDES[currentIndex].src}
                            alt="Ambient backdrop"
                            fill
                            priority
                            className="object-cover blur-3xl saturate-150 opacity-80"
                        />
                    </motion.div>
                </AnimatePresence>
                
                {/* Subtle dark gradient overlay as requested for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/30 z-10" />
            </div>

            {/* Floating Educational Glassmorphism Icons */}
            <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
                {FLOATING_ICONS.map(({ Icon, top, left, right, delay, duration, size }, idx) => (
                    <motion.div
                        key={idx}
                        style={{
                            position: "absolute",
                            top: top || "auto",
                            left: left || "auto",
                            right: right || "auto",
                            bottom: "auto"
                        }}
                        initial={{ y: 0, opacity: 0 }}
                        animate={{
                            y: [0, -12, 0],
                            opacity: 0.75
                        }}
                        transition={{
                            y: {
                                repeat: Infinity,
                                duration: duration,
                                ease: "easeInOut",
                                delay: delay
                            },
                            opacity: {
                                duration: 1,
                                delay: 0.5
                            }
                        }}
                        className="flex items-center justify-center p-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
                    >
                        <Icon className={size} />
                    </motion.div>
                ))}
            </div>

            {/* Active Poster Container (Primary visual focus, fully visible) */}
            <div className="relative z-30 flex-1 flex items-center justify-center w-full max-h-[75vh] py-4">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="relative w-full h-full flex items-center justify-center"
                    >
                        <div className="relative w-full h-full max-w-md md:max-w-lg aspect-[3/4] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 backdrop-blur-sm">
                            <Image
                                src={SLIDES[currentIndex].src}
                                alt={SLIDES[currentIndex].alt}
                                fill
                                sizes="(max-width: 1024px) 100vw, 60vw"
                                priority
                                className="object-contain"
                            />
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Pagination Indicators - Bottom Center */}
            <div className="relative z-30 pb-4 flex items-center justify-center gap-2">
                {SLIDES.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleDotClick(idx)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                            idx === currentIndex ? "w-6 bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" : "w-2 bg-white/30 hover:bg-white/50"
                        }`}
                        title={`Slide ${idx + 1}`}
                    />
                ))}
            </div>

        </div>
    );
}
