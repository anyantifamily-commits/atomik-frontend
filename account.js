import { supabase } from "./supabase.js";

/* CONFIG */

const API_URL =
"https://atomik-server.onrender.com";

const FREE_LIMIT = 3;

/* ELEMENTS */

const userName =
document.getElementById("userName");

const userEmail =
document.getElementById("userEmail");

const avatar =
document.getElementById("avatar");

const backButton =
document.getElementById("backButton");

const historyButton =
document.getElementById("historyButton");

const signOutButton =
document.getElementById("signOutButton");

const accountMessage =
document.getElementById("accountMessage");

const planLabel =
document.getElementById("planLabel");

const planDescription =
document.getElementById("planDescription");

const usageCount =
document.getElementById("usageCount");

const usageRemaining =
document.getElementById("usageRemaining");

const usageProgress =
document.getElementById("usageProgress");

const usageUsed =
document.getElementById("usageUsed");

const usageLimit =
document.getElementById("usageLimit");

const usageMessage =
document.getElementById("usageMessage");

const completedCount =
document.getElementById("completedCount");

const questionsAnswered =
document.getElementById("questionsAnswered");

/* STATE */

let currentUser = null;

let redirecting = false;

/* SAFE REDIRECT */

function redirectToAuth() {

if (redirecting) return;

redirecting = true;

window.location.replace("auth.html");

}

/* PAYMENT RETURN */

async function handlePaymentReturn() {

const params =
    new URLSearchParams(
        window.location.search
    );

/*
 * Paystack returns the transaction
 * reference in the callback URL.
 */

const reference =
    params.get("reference");

/*
 * Nothing to do when the user
 * simply visits account.html.
 */

if (!reference) {

    return;
}

if (accountMessage) {

    accountMessage.textContent =
        "Verifying your Paystack payment...";
}

if (planLabel) {

    planLabel.textContent =
        "VERIFYING PAYMENT...";
}

if (planDescription) {

    planDescription.textContent =
        "Please wait while we confirm your subscription.";
}

try {

    const {
        data: { session }
    } =
        await supabase.auth.getSession();

    if (!session?.access_token) {

        throw new Error(
            "Your Atomik session has expired. Please sign in again."
        );
    }

    const response =
        await fetch(
            `${API_URL}/paystack/verify/${encodeURIComponent(reference)}`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${session.access_token}`
                }
            }
        );

    let data = null;

    try {

        data =
            await response.json();

    } catch {

        data = null;
    }

    if (!response.ok) {

        throw new Error(
            data?.error ||
            "Unable to verify your payment."
        );
    }

    if (
        !data?.success ||
        data?.paid !== true
    ) {

        throw new Error(
            data?.error ||
            "Paystack could not confirm the payment."
        );
    }

    /*
     * Payment has been verified by
     * the Atomik backend.
     */

    if (accountMessage) {

        accountMessage.textContent =
            "Payment verified successfully. Your Premium plan is now active.";
    }

    /*
     * Remove the payment query
     * from the browser address bar.
     */

    window.history.replaceState(
        {},
        document.title,
        "account.html"
    );

    /*
     * Reload usage so the page
     * immediately reflects Premium.
     */

    await loadUsage();

} catch (error) {

    console.error(
        "Payment verification error:",
        error
    );

    if (accountMessage) {

        accountMessage.textContent =
            error?.message ||
            "We couldn't verify your payment. Please refresh and try again.";
    }

    /*
     * Keep the URL intact when
     * verification fails so the
     * reference is not lost.
     */

    return;
}

}

/* LOAD USER */

async function loadUser() {

try {

    const {
        data: { user },
        error
    } = await supabase.auth.getUser();

    if (error) {
        throw error;
    }

    if (!user) {

        redirectToAuth();

        return;
    }

    currentUser = user;

    const name =
        user.user_metadata?.name ||
        "Atomik User";

    const email =
        user.email ||
        "No email";

    if (userName) {
        userName.textContent = name;
    }

    if (userEmail) {
        userEmail.textContent = email;
    }

    if (avatar) {

        avatar.textContent =
            name
                .charAt(0)
                .toUpperCase() || "A";
    }

    await Promise.all([
        loadUsage(),
        loadQuizActivity()
    ]);

    /*
     * Check for a Paystack
     * return after the normal
     * account data has loaded.
     */

    await handlePaymentReturn();

} catch (error) {

    console.error(
        "Unable to load user:",
        error
    );

    redirectToAuth();
}

}

/* LOAD USAGE */

async function loadUsage() {

try {

    setUsageLoading();

    const {
        data: { session }
    } = await supabase.auth.getSession();

    if (!session?.access_token) {

        throw new Error(
            "No active session."
        );
    }

    const response =
        await fetch(
            `${API_URL}/usage`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${session.access_token}`
                }
            }
        );

    let data = null;

    try {

        data =
            await response.json();

    } catch {

        data = null;
    }

    if (!response.ok) {

        throw new Error(
            data?.error ||
            "Unable to load Atomik usage."
        );
    }

    if (!data?.success) {

        throw new Error(
            data?.error ||
            "Unable to load Atomik usage."
        );
    }

    const plan =
        String(
            data.plan ||
            "free"
        );

    /*
     * PREMIUM USERS
     */

    if (data.unlimited === true) {

        const used =
            Number(data.used);

        updatePlan(plan);

        updateUnlimitedUsage(
            Number.isFinite(used)
                ? used
                : 0
        );

        return;
    }

    /*
     * FREE USERS
     */

    const used =
        Number(data.used);

    const remaining =
        Number(data.remaining);

    const limit =
        Number(data.limit);

    if (
        !Number.isFinite(used) ||
        !Number.isFinite(remaining) ||
        !Number.isFinite(limit)
    ) {

        throw new Error(
            "Atomik returned invalid usage information."
        );
    }

    updatePlan(plan);

    updateUsage(
        used,
        remaining,
        limit
    );

} catch (error) {

    console.error(
        "Usage loading error:",
        error
    );

    showUsageError(error);
}

}

/* LOAD QUIZ ACTIVITY */

async function loadQuizActivity() {

try {

    if (!currentUser) {
        return;
    }

    if (completedCount) {
        completedCount.textContent = "…";
    }

    if (questionsAnswered) {
        questionsAnswered.textContent = "…";
    }

    const {
        data,
        error
    } = await supabase
        .from("quizzes")
        .select(
            "question_count, completed"
        )
        .eq(
            "user_id",
            currentUser.id
        );

    if (error) {
        throw error;
    }

    const quizzes =
        Array.isArray(data)
            ? data
            : [];

    const completed =
        quizzes.filter(
            quiz =>
                quiz.completed === true
        );

    let totalQuestions = 0;

    for (const quiz of completed) {

        const count =
            Number(
                quiz.question_count
            );

        if (
            Number.isFinite(count) &&
            count > 0
        ) {

            totalQuestions +=
                Math.floor(count);
        }
    }

    if (completedCount) {

        completedCount.textContent =
            completed.length.toLocaleString();
    }

    if (questionsAnswered) {

        questionsAnswered.textContent =
            totalQuestions.toLocaleString();
    }

} catch (error) {

    console.error(
        "Quiz activity loading error:",
        error
    );

    if (completedCount) {
        completedCount.textContent = "—";
    }

    if (questionsAnswered) {
        questionsAnswered.textContent = "—";
    }
}

}

/* LOADING STATE */

function setUsageLoading() {

if (planLabel) {
    planLabel.textContent =
        "CHECKING PLAN...";
}

if (planDescription) {
    planDescription.textContent =
        "Checking your account...";
}

if (usageCount) {
    usageCount.textContent =
        "Loading...";
}

if (usageRemaining) {
    usageRemaining.textContent =
        "Loading...";
}

if (usageUsed) {
    usageUsed.textContent =
        "Checking usage...";
}

if (usageLimit) {
    usageLimit.textContent =
        `${FREE_LIMIT} total`;
}

if (usageMessage) {
    usageMessage.textContent =
        "Checking your Atomik usage...";
}

if (usageProgress) {
    usageProgress.style.width =
        "0%";
}

}

/* UPDATE PLAN */

function updatePlan(plan) {

const normalizedPlan =
    String(plan)
        .trim()
        .toLowerCase();

if (
    normalizedPlan === "free" ||
    !normalizedPlan
) {

    if (planLabel) {
        planLabel.textContent =
            "FREE PLAN";
    }

    if (planDescription) {
        planDescription.textContent =
            "Your current Atomik plan";
    }

    return;
}

/*
 * PREMIUM MONTHLY
 */

if (
    normalizedPlan ===
    "premium_monthly"
) {

    if (planLabel) {
        planLabel.textContent =
            "PREMIUM MONTHLY PLAN";
    }

    if (planDescription) {
        planDescription.textContent =
            "Unlimited quiz generation";
    }

    return;
}

/*
 * PREMIUM YEARLY
 */

if (
    normalizedPlan ===
    "premium_yearly"
) {

    if (planLabel) {
        planLabel.textContent =
            "PREMIUM YEARLY PLAN";
    }

    if (planDescription) {
        planDescription.textContent =
            "Unlimited quiz generation";
    }

    return;
}

/*
 * FALLBACK
 */

const readablePlan =
    normalizedPlan
        .replace(
            /[_-]+/g,
            " "
        )
        .replace(
            /\b\w/g,
            letter =>
                letter.toUpperCase()
        );

if (planLabel) {

    planLabel.textContent =
        `${readablePlan.toUpperCase()} PLAN`;
}

if (planDescription) {

    planDescription.textContent =
        "Your current Atomik plan";
}

}

/* UPDATE FREE USAGE */

function updateUsage(
used,
remaining,
limit
) {

const safeLimit =
    Math.max(
        Math.floor(limit),
        0
    );

const safeUsed =
    Math.min(
        Math.max(
            Math.floor(used),
            0
        ),
        safeLimit
    );

const safeRemaining =
    Math.min(
        Math.max(
            Math.floor(remaining),
            0
        ),
        safeLimit
    );

const percentage =
    safeLimit > 0
        ? (safeUsed / safeLimit) * 100
        : 0;

if (usageCount) {

    usageCount.textContent =
        `${safeUsed} / ${safeLimit}`;
}

if (usageRemaining) {

    usageRemaining.textContent =
        safeRemaining === 1
            ? "1 remaining"
            : `${safeRemaining} remaining`;
}

if (usageProgress) {

    usageProgress.style.width =
        `${Math.min(
            Math.max(
                percentage,
                0
            ),
            100
        )}%`;
}

if (usageUsed) {

    usageUsed.textContent =
        safeUsed === 1
            ? "1 generation used"
            : `${safeUsed} generations used`;
}

if (usageLimit) {

    usageLimit.textContent =
        `${safeLimit} total`;
}

if (usageMessage) {

    if (safeRemaining <= 0) {

        usageMessage.textContent =
            "You have used all your free generations.";

    } else if (safeRemaining === 1) {

        usageMessage.textContent =
            "You have 1 free generation remaining.";

    } else {

        usageMessage.textContent =
            `${safeRemaining} free generations are available.`;
    }
}

}

/* UPDATE PREMIUM USAGE */

function updateUnlimitedUsage(used) {

const safeUsed =
    Math.max(
        Math.floor(used),
        0
    );

if (usageCount) {

    usageCount.textContent =
        "Unlimited";
}

if (usageRemaining) {

    usageRemaining.textContent =
        "Unlimited";
}

if (usageProgress) {

    usageProgress.style.width =
        "100%";
}

if (usageUsed) {

    usageUsed.textContent =
        safeUsed === 1
            ? "1 generation used"
            : `${safeUsed.toLocaleString()} generations used`;
}

if (usageLimit) {

    usageLimit.textContent =
        "Unlimited";
}

if (usageMessage) {

    usageMessage.textContent =
        "You have unlimited quiz generations.";
}

}

/* USAGE ERROR */

function showUsageError(error) {

if (planLabel) {
    planLabel.textContent =
        "PLAN UNAVAILABLE";
}

if (planDescription) {
    planDescription.textContent =
        "Usage temporarily unavailable";
}

if (usageCount) {
    usageCount.textContent =
        "—";
}

if (usageRemaining) {
    usageRemaining.textContent =
        "Unavailable";
}

if (usageProgress) {
    usageProgress.style.width =
        "0%";
}

if (usageUsed) {
    usageUsed.textContent =
        "Usage could not be loaded";
}

if (usageLimit) {
    usageLimit.textContent =
        "Unavailable";
}

if (usageMessage) {
    usageMessage.textContent =
        "We couldn't reach the Atomik usage service. Try refreshing the page.";
}

if (accountMessage) {
    accountMessage.textContent =
        "Usage information is temporarily unavailable.";
}

}

/* BACK TO ATOMIK */

if (backButton) {

backButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "index.html";
    }
);

}

/* QUIZ HISTORY */

if (historyButton) {

historyButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "history.html";
    }
);

}

/* SIGN OUT */

if (signOutButton) {

signOutButton.addEventListener(
    "click",
    async () => {

        signOutButton.disabled =
            true;

        signOutButton.textContent =
            "Signing out...";

        try {

            const {
                error
            } =
                await supabase.auth.signOut({
                    scope: "local"
                });

            if (error) {
                throw error;
            }

            redirectToAuth();

        } catch (error) {

            console.error(
                "Sign out error:",
                error
            );

            if (accountMessage) {

                accountMessage.textContent =
                    "Unable to sign out. Please try again.";
            }

            signOutButton.disabled =
                false;

            signOutButton.textContent =
                "Sign Out";
        }
    }
);

}

/* AUTH STATE PROTECTION */

supabase.auth.onAuthStateChange(
(event, session) => {

    if (
        event === "SIGNED_OUT" ||
        !session
    ) {

        redirectToAuth();
    }
}

);

/* START */

loadUser();
