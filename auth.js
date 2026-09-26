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

/*
   Atomik is hosted inside the
   /atomik-frontend/ GitHub Pages folder.

   Keep this relative because auth.html
   and index.html are in the same folder.
*/

const HOME_PAGE = "index.html";


/*
   This is the actual deployed
   authentication page.

   Do NOT use window.location.origin
   here because that would remove
   /atomik-frontend/.
*/

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

    /*
       If the user is already signed in,
       there is no reason to show the
       login page again.
    */

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
           When Supabase finishes handling
           an email confirmation redirect,
           the user may receive a session.

           Send them to the homepage.
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
   CHECK URL AUTH RESULT
================================ */

function checkAuthRedirect() {

    const hash =
        window.location.hash;

    if (!hash) {
        return;
    }

    const params =
        new URLSearchParams(
            hash.substring(1)
        );

    const error =
        params.get("error");

    const errorDescription =
        params.get(
            "error_description"
        );

    if (error) {

        console.error(
            "Authentication redirect error:",
            errorDescription || error
        );

        showMessage(
            errorDescription ||
            "Email confirmation could not be completed.",
            "error"
        );

        /*
           Remove the sensitive/auth
           information from the address bar.
        */

        window.history.replaceState(
            {},
            document.title,
            window.location.pathname
        );

        return;
    }

    /*
       If access information exists,
       Supabase's client will process it
       automatically because
       detectSessionInUrl is enabled.
    */

    if (
        params.has("access_token") ||
        params.has("refresh_token")
    ) {

        showMessage(
            "Email confirmed successfully. Welcome to Atomik!",
            "success"
        );

        window.history.replaceState(
            {},
            document.title,
            window.location.pathname
        );
    }
}


/* ================================
   INITIALIZE AUTH PAGE
================================ */

checkAuthRedirect();
checkExistingSession();


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

                        /*
                           IMPORTANT:
                           Use the full deployed
                           GitHub Pages path.
                        */

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
                            /*
                               Use the full deployed
                               GitHub Pages path.
                            */

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
