import { supabase } from "./supabase.js";


/* ================================
   ELEMENTS
================================ */

const signinForm = document.getElementById("signinForm");
const signupForm = document.getElementById("signupForm");

const switchAuth = document.getElementById("switchAuth");
const switchText = document.getElementById("switchText");

const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");

const authMessage = document.getElementById("authMessage");

const forgotPassword =
    document.getElementById("forgotPassword");


/* ================================
   REDIRECT
================================ */

const HOME_PAGE = "index.html";

const AUTH_REDIRECT_URL =
    "https://anyantifamily-commits.github.io/atomik-frontend/auth.html";


/* ================================
   AUTH MODE
================================ */

let signupMode = false;


/* ================================
   MESSAGE
================================ */

function showMessage(message, type = "error") {

    authMessage.textContent = message;

    authMessage.className =
        `auth-message show ${type}`;
}


function clearMessage() {

    authMessage.textContent = "";

    authMessage.className =
        "auth-message";
}


/* ================================
   CHECK EXISTING SESSION
================================ */

async function checkExistingSession() {

    const {
        data: { session },
        error
    } = await supabase.auth.getSession();

    if (error) {

        console.error(
            "Session check error:",
            error
        );

        return;
    }

    if (session) {

        window.location.replace(
            HOME_PAGE
        );
    }
}


/* ================================
   AUTH STATE LISTENER
================================ */

supabase.auth.onAuthStateChange(
    (event, session) => {

        console.log(
            "Auth event:",
            event
        );

        /*
           Supabase can create a session when
           the user confirms their email.

           Once that happens, send them home.
        */

        if (
            event === "SIGNED_IN" &&
            session
        ) {

            window.location.replace(
                HOME_PAGE
            );
        }

    }
);


/* ================================
   HANDLE AUTH CALLBACK
================================ */

async function handleAuthCallback() {

    /*
       Supabase confirmation links normally
       contain authentication information
       in the URL.

       We let Supabase process the URL first
       because detectSessionInUrl is enabled
       in supabase.js.
    */

    const hash =
        window.location.hash;

    const search =
        window.location.search;

    const hasAuthHash =
        hash.includes("access_token") ||
        hash.includes("refresh_token") ||
        hash.includes("error=");

    const hasAuthCode =
        search.includes("code=");

    if (
        !hasAuthHash &&
        !hasAuthCode
    ) {
        return false;
    }

    console.log(
        "Supabase authentication callback detected."
    );

    /*
       Give the Supabase client a moment to
       process the authentication URL.
    */

    await new Promise(
        resolve => setTimeout(resolve, 500)
    );


    const {
        data: { session },
        error
    } =
        await supabase.auth.getSession();


    if (error) {

        console.error(
            "Callback session error:",
            error
        );

        showMessage(
            "We couldn't complete the email confirmation. Please try again.",
            "error"
        );

        return true;
    }


    if (session) {

        console.log(
            "Authentication session established."
        );

        showMessage(
            "Email confirmed successfully. Welcome to Atomik!",
            "success"
        );

        /*
           Give the user a short moment to see
           the success message before entering
           the app.
        */

        setTimeout(
            () => {

                window.history.replaceState(
                    {},
                    document.title,
                    window.location.pathname
                );

                window.location.replace(
                    HOME_PAGE
                );

            },
            700
        );

        return true;
    }


    /*
       If the callback existed but Supabase
       did not create a session, don't pretend
       that confirmation succeeded.
    */

    console.warn(
        "Authentication callback detected but no session was created."
    );

    showMessage(
        "Your email confirmation was received, but we couldn't create your login session. Please try signing in again.",
        "error"
    );

    return true;
}


/* ================================
   INITIALIZE AUTH PAGE
================================ */

async function initializeAuthPage() {

    /*
       Handle a confirmation/reset callback
       before doing the normal session check.
    */

    const callbackHandled =
        await handleAuthCallback();

    /*
       If a callback was handled, don't run
       the normal session redirect immediately.
    */

    if (callbackHandled) {
        return;
    }

    await checkExistingSession();
}


initializeAuthPage();


/* ================================
   SWITCH SIGN IN / SIGN UP
================================ */

switchAuth.addEventListener(
    "click",
    () => {

        signupMode = !signupMode;

        clearMessage();

        if (signupMode) {

            signinForm.classList.add(
                "hidden"
            );

            signupForm.classList.remove(
                "hidden"
            );

            authTitle.textContent =
                "Create your account";

            authSubtitle.textContent =
                "Join Atomik and keep your quizzes in one place.";

            switchText.textContent =
                "Already have an account?";

            switchAuth.textContent =
                "Sign in";

        } else {

            signupForm.classList.add(
                "hidden"
            );

            signinForm.classList.remove(
                "hidden"
            );

            authTitle.textContent =
                "Welcome back";

            authSubtitle.textContent =
                "Sign in to continue to Atomik.";

            switchText.textContent =
                "Don't have an account?";

            switchAuth.textContent =
                "Create account";
        }

    }
);


/* ================================
   SHOW / HIDE PASSWORD
================================ */

document
    .querySelectorAll(".show-password")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const targetId =
                    button.dataset.target;

                const input =
                    document.getElementById(
                        targetId
                    );

                if (
                    input.type ===
                    "password"
                ) {

                    input.type = "text";

                    button.textContent =
                        "Hide";

                } else {

                    input.type =
                        "password";

                    button.textContent =
                        "Show";
                }

            }
        );

    });


/* ================================
   SIGN UP
================================ */

signupForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        clearMessage();

        const name =
            document
                .getElementById("signupName")
                .value
                .trim();

        const email =
            document
                .getElementById("signupEmail")
                .value
                .trim();

        const password =
            document
                .getElementById("signupPassword")
                .value;

        const confirmPassword =
            document
                .getElementById(
                    "confirmPassword"
                )
                .value;

        const button =
            document.getElementById(
                "signupButton"
            );


        /* Password check */

        if (
            password !==
            confirmPassword
        ) {

            showMessage(
                "Passwords do not match.",
                "error"
            );

            return;
        }


        if (
            password.length < 6
        ) {

            showMessage(
                "Password must be at least 6 characters.",
                "error"
            );

            return;
        }


        /* Loading */

        button.disabled = true;

        button.textContent =
            "Creating account...";


        try {

            const {
                data,
                error
            } =
                await supabase.auth.signUp({

                    email: email,

                    password: password,

                    options: {

                        data: {
                            name: name
                        },

                        emailRedirectTo:
                            AUTH_REDIRECT_URL
                    }

                });


            if (error) {
                throw error;
            }


            /*
               Email confirmation is enabled.
               Therefore Supabase normally
               returns a user but no session.
            */

            if (
                data.user &&
                !data.session
            ) {

                showMessage(
                    "Account created! Check your email and click the confirmation link.",
                    "success"
                );

                signupForm.reset();

            } else {

                showMessage(
                    "Account created successfully. Redirecting...",
                    "success"
                );

                setTimeout(
                    () => {

                        window.location.replace(
                            HOME_PAGE
                        );

                    },
                    700
                );
            }


        } catch (error) {

            console.error(error);

            showMessage(
                error.message ||
                "Something went wrong while creating your account.",
                "error"
            );

        } finally {

            button.disabled = false;

            button.textContent =
                "Create Account";
        }

    }
);


/* ================================
   SIGN IN
================================ */

signinForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        clearMessage();

        const email =
            document
                .getElementById("signinEmail")
                .value
                .trim();

        const password =
            document
                .getElementById(
                    "signinPassword"
                )
                .value;

        const button =
            document.getElementById(
                "signinButton"
            );


        button.disabled = true;

        button.textContent =
            "Signing in...";


        try {

            const {
                data,
                error
            } =
                await supabase.auth
                    .signInWithPassword({

                        email: email,

                        password: password
                    });


            if (error) {
                throw error;
            }


            if (!data.session) {

                throw new Error(
                    "No active session was created."
                );
            }


            showMessage(
                "Signed in successfully. Welcome to Atomik!",
                "success"
            );


            setTimeout(
                () => {

                    window.location.replace(
                        HOME_PAGE
                    );

                },
                700
            );


        } catch (error) {

            console.error(error);

            showMessage(
                error.message ||
                "Unable to sign in. Please check your details.",
                "error"
            );

        } finally {

            button.disabled = false;

            button.textContent =
                "Sign In";
        }

    }
);


/* ================================
   FORGOT PASSWORD
================================ */

forgotPassword.addEventListener(
    "click",
    async () => {

        const email =
            document
                .getElementById("signinEmail")
                .value
                .trim();


        if (!email) {

            showMessage(
                "Enter your email address first, then tap Forgot password.",
                "info"
            );

            return;
        }


        try {

            const {
                error
            } =
                await supabase.auth
                    .resetPasswordForEmail(
                        email,
                        {
                            redirectTo:
                                AUTH_REDIRECT_URL
                        }
                    );


            if (error) {
                throw error;
            }


            showMessage(
                "If that email is registered, a password reset link has been sent.",
                "success"
            );


        } catch (error) {

            console.error(error);

            showMessage(
                error.message ||
                "Unable to send the password reset email.",
                "error"
            );
        }

    }
);
