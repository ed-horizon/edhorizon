'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { login } from './actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from 'lucide-react'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import Image from 'next/image'
import { motion } from 'framer-motion'

function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <Button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold h-11 rounded-xl shadow-md border-0 transition-all hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(249,115,22,0.35)] disabled:opacity-50"
            disabled={pending}
        >
            {pending ? "Please wait..." : "Login"}
        </Button>
    )
}

export default function AuthForm({ message, error }: { message?: string, error?: string }) {
    const [showPassword, setShowPassword] = useState(false)

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="w-full flex justify-center"
        >
            <Card className="w-full max-w-md border border-white/20 bg-white/45 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.06)] rounded-[20px] transition-all duration-300 hover:shadow-indigo-500/5 dark:bg-slate-900/45 dark:border-white/10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
                <CardHeader className="space-y-4 pt-8">
                    <div className="flex flex-col items-center gap-3">
                        {/* ED HORIZON Logo */}
                        <div className="relative h-14 w-14 overflow-hidden rounded-2xl shadow-md ring-2 ring-white/20">
                            <Image
                                src="/logo.jpg"
                                alt="EdHorizon Logo"
                                fill
                                className="object-cover"
                            />
                        </div>
                        {/* Welcome Heading */}
                        <CardTitle className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-sans text-center">
                            Welcome Back
                        </CardTitle>
                    </div>
                    <CardDescription className="text-slate-500 text-center text-xs dark:text-slate-400">
                        {message ? (
                            <span className="text-emerald-600 font-semibold dark:text-emerald-400">{message}</span>
                        ) : error ? (
                            <span className="text-rose-600 font-semibold dark:text-rose-400">{error}</span>
                        ) : (
                            "Manage your academy and learning modules"
                        )}
                    </CardDescription>
                </CardHeader>
                <form action={login}>
                    <CardContent className="grid gap-5">
                        <div className="grid gap-2">
                            <Label htmlFor="email" className="text-slate-600 font-semibold text-xs tracking-wider uppercase dark:text-slate-300">Email Address</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="username"
                                placeholder="email@example.com"
                                required
                                className="border-slate-200 bg-white/50 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl h-11 dark:border-white/10 dark:bg-white/5 dark:text-white"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password" className="text-slate-600 font-semibold text-xs tracking-wider uppercase dark:text-slate-300">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    required
                                    className="border-slate-200 bg-white/50 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl h-11 pr-10 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white focus:outline-none"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="mt-4 pb-8 flex flex-col gap-4">
                        <SubmitButton />
                    </CardFooter>
                </form>
            </Card>
        </motion.div>
    )
}
