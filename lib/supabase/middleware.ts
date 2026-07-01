
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    // Cron routes authenticate with their own server-only bearer secret. Let the
    // request reach the route handler without requiring a browser session.
    if (request.nextUrl.pathname === "/api/cron/reminders") {
        return NextResponse.next();
    }

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user && !request.nextUrl.pathname.startsWith("/login") && !request.nextUrl.pathname.startsWith("/auth")) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const role = profile?.role || 'student';
        let isInactive = false;

        if (role === 'student' || role === 'parent') {
            const { data: details } = await supabase
                .from('student_details')
                .select('status')
                .eq('id', user.id)
                .maybeSingle();
            if (details?.status === 'inactive') {
                isInactive = true;
            }
        } else {
            const { data: details } = await supabase
                .from('staff_details')
                .select('status')
                .eq('id', user.id)
                .maybeSingle();
            if (details?.status === 'inactive') {
                isInactive = true;
            }
        }

        if (isInactive) {
            await supabase.auth.signOut();
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            url.searchParams.set("error", "Your account has been deactivated. Please contact administration.");
            
            const redirectResponse = NextResponse.redirect(url);
            response.cookies.getAll().forEach(cookie => {
                redirectResponse.cookies.set(cookie.name, cookie.value, {
                    path: cookie.path,
                    domain: cookie.domain,
                    maxAge: cookie.maxAge,
                    secure: cookie.secure,
                    sameSite: cookie.sameSite,
                    expires: cookie.expires
                });
            });
            return redirectResponse;
        }
    }

    // If no user and trying to access protected routes, redirect to login
    if (!user && !request.nextUrl.pathname.startsWith("/login") && !request.nextUrl.pathname.startsWith("/auth")) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // If user exists and is on login page, redirect to dashboard (simplified for now)
    if (user && request.nextUrl.pathname.startsWith("/login")) {
        const url = request.nextUrl.clone();
        url.pathname = "/student"; // Default redirect
        return NextResponse.redirect(url);
    }

    return response;
}
