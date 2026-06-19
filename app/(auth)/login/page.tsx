import AuthForm from "./auth-form"
import LoginSlideshow from "./LoginSlideshow"

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LoginPage(props: Props) {
    const searchParams = await props.searchParams;
    const message = typeof searchParams.message === 'string' ? searchParams.message : undefined;
    const error = typeof searchParams.error === 'string' ? searchParams.error : undefined;

    return (
        <div className="w-full h-screen flex flex-col lg:flex-row overflow-hidden bg-background">
            {/* Left Side: Hero Banner Section (60% width) */}
            <div className="w-full lg:w-[60%] h-[45vh] lg:h-full relative border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800/20">
                <LoginSlideshow />
            </div>

            {/* Right Side: Login Panel (40% width) with light blue to white gradient and minimal abstract shapes */}
            <div className="w-full lg:w-[40%] h-[55vh] lg:h-full flex items-center justify-center p-6 md:p-12 relative overflow-hidden bg-gradient-to-br from-[#eff6ff] via-white to-[#e8eeff] dark:from-[#07090e] dark:via-[#0e1220] dark:to-[#07090e]">
                
                {/* Minimal Abstract SaaS Shapes */}
                <div className="absolute top-[10%] right-[-10%] w-[300px] h-[300px] bg-blue-300/30 dark:bg-blue-600/10 rounded-full blur-[80px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[5%] left-[-5%] w-[250px] h-[250px] bg-indigo-300/30 dark:bg-indigo-600/10 rounded-full blur-[70px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
                <div className="absolute top-[45%] left-[20%] w-[150px] h-[150px] bg-orange-200/20 dark:bg-orange-500/5 rounded-full blur-[50px] pointer-events-none" />

                <div className="relative z-10 w-full max-w-md">
                    <AuthForm
                        message={message}
                        error={error}
                    />
                </div>
            </div>
        </div>
    )
}

