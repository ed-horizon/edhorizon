'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ROLE_REDIRECTS } from '@/lib/constants'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    // 3. Fetch user role from profiles
    const { data: authData, error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        return redirect('/login?error=' + encodeURIComponent(error.message))
    }

    // 3. Fetch user role from profiles
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

    const role = profile?.role as keyof typeof ROLE_REDIRECTS || 'student'

    // Check status based on user role to block inactive users
    let isInactive = false;
    if (role === 'student' || role === 'parent') {
        const { data: details } = await supabase
            .from('student_details')
            .select('status')
            .eq('id', authData.user.id)
            .maybeSingle();
        if (details?.status === 'inactive') {
            isInactive = true;
        }
    } else {
        const { data: details } = await supabase
            .from('staff_details')
            .select('status')
            .eq('id', authData.user.id)
            .maybeSingle();
        if (details?.status === 'inactive') {
            isInactive = true;
        }
    }

    if (isInactive) {
        await supabase.auth.signOut();
        return redirect('/login?error=' + encodeURIComponent("Your account has been deactivated. Please contact administration."));
    }

    const targetPath = ROLE_REDIRECTS[role] || '/student'

    revalidatePath('/', 'layout')
    redirect(targetPath)
}

export async function signup(formData: FormData) {
    const supabase = await createClient()
    const headersList = await headers();
    const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        options: {
            data: {
                full_name: formData.get('full_name') as string,
                role: 'student',
            },
            emailRedirectTo: `${origin}/auth/callback`,
        },
    }

    const { data: authData, error } = await supabase.auth.signUp(data)

    if (error) {
        if (error.code) console.error("Signup error:", error);
        return redirect('/login?error=' + encodeURIComponent(error.message))
    }

    if (authData.session) {
        // Fetch role if identity is immediately available
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authData.session.user.id)
            .single()

        const role = profile?.role as keyof typeof ROLE_REDIRECTS || 'student'
        const targetPath = ROLE_REDIRECTS[role] || '/student'

        revalidatePath('/', 'layout')
        return redirect(targetPath)
    }

    revalidatePath('/', 'layout')
    return redirect('/login?message=Account created! Please check your email to confirm.')
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}
