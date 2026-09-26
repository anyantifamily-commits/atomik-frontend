import { supabase } from "./supabase.js";


// =============================
// DOM
// =============================

const historyList = document.getElementById("historyList");
const emptyState = document.getElementById("emptyState");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");


// Confirmation modal
const confirmOverlay = document.getElementById("confirmOverlay");
const confirmTitle = document.getElementById("confirmTitle");
const confirmMessage = document.getElementById("confirmMessage");
const confirmIcon = document.getElementById("confirmIcon");
const confirmCancelBtn = document.getElementById("confirmCancelBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");


// =============================
// STATE
// =============================

let history = [];

let confirmResolver = null;
let lastFocusedElement = null;


// =============================
// HELPERS
// =============================

function getQuizTitle(attempt) {

    if (attempt.focus === "topic" && attempt.topic) {
        return attempt.topic;
    }

    if (attempt.title) {
        return attempt.title.replace(/\.[^/.]+$/, "");
    }

    return "Atomik Quiz";
}


function formatDifficulty(difficulty) {

    if (!difficulty) {
        return "Mixed";
    }

    return difficulty.charAt(0).toUpperCase()
        + difficulty.slice(1).toLowerCase();
}


function getFocusLabel(attempt) {

    if (attempt.focus === "topic") {
        return attempt.topic
            ? `Topic: ${attempt.topic}`
            : "Specific topic";
    }

    return "Entire document";
}


function getSelectedValues(attempt) {

    if (
        attempt.user_answers &&
        Array.isArray(attempt.user_answers)
    ) {
        return attempt.user_answers;
    }

    return [];
}


function formatDate(dateString) {

    if (!dateString) {
        return "Unknown date";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "Unknown date";
    }

    return date.toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short"
    });
}


// =============================
// CUSTOM CONFIRM MODAL
// =============================

function showConfirmModal({
    title,
    message,
    confirmText = "Delete",
    icon = "!"
}) {

    return new Promise((resolve) => {

        confirmResolver = resolve;

        lastFocusedElement =
            document.activeElement;

        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        confirmDeleteBtn.textContent = confirmText;
        confirmIcon.textContent = icon;

        confirmOverlay.classList.add("active");

        confirmOverlay.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow = "hidden";

        setTimeout(() => {
            confirmDeleteBtn.focus();
        }, 50);
    });
}


function closeConfirmModal(result) {

    confirmOverlay.classList.remove("active");

    confirmOverlay.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow = "";

    if (confirmResolver) {

        const resolve = confirmResolver;

        confirmResolver = null;

        resolve(result);
    }

    if (lastFocusedElement) {

        try {
            lastFocusedElement.focus();
        } catch (error) {
            // Ignore focus restoration errors.
        }

        lastFocusedElement = null;
    }
}


confirmCancelBtn.addEventListener(
    "click",
    () => {
        closeConfirmModal(false);
    }
);


confirmDeleteBtn.addEventListener(
    "click",
    () => {
        closeConfirmModal(true);
    }
);


// Clicking the dark background closes the modal
confirmOverlay.addEventListener(
    "click",
    (event) => {

        if (event.target === confirmOverlay) {
            closeConfirmModal(false);
        }
    }
);


// Escape closes the modal
document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Escape" &&
            confirmOverlay.classList.contains("active")
        ) {
            closeConfirmModal(false);
        }
    }
);


// =============================
// LOAD HISTORY
// =============================

async function loadHistory() {

    const {
        data: {
            user
        }
    } = await supabase.auth.getUser();


    if (!user) {

        window.location.href = "auth.html";

        return;
    }


    const {
        data,
        error
    } = await supabase
        .from("quizzes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
            ascending: false
        });


    if (error) {

        console.error(
            "Failed to load history:",
            error
        );

        historyList.innerHTML = `
            <p class="history-error">
                Failed to load quiz history.
                Please refresh and try again.
            </p>
        `;

        return;
    }


    history = data || [];

    displayHistory();
}


// =============================
// DISPLAY HISTORY
// =============================

function displayHistory() {

    historyList.innerHTML = "";


    if (history.length === 0) {

        historyList.style.display = "none";
        emptyState.style.display = "flex";
        clearHistoryBtn.style.display = "none";

        return;
    }


    historyList.style.display = "flex";
    emptyState.style.display = "none";
    clearHistoryBtn.style.display = "block";


    history.forEach((attempt, index) => {

        const card = document.createElement("article");

        card.className = "history-card";


        const total =
            Number(attempt.question_count) ||
            (
                Array.isArray(attempt.questions)
                    ? attempt.questions.length
                    : 0
            );


        const score =
            attempt.score !== null &&
            attempt.score !== undefined
                ? Number(attempt.score)
                : null;


        const completed =
            attempt.completed === true;


        let scoreText = "Not completed";

        if (completed && score !== null) {
            scoreText = `${score} / ${total}`;
        }


        card.innerHTML = `

            <div class="history-card-top">

                <div>

                    <h2 class="history-title">
                        ${escapeHTML(getQuizTitle(attempt))}
                    </h2>

                    <div class="history-info">

                        ${escapeHTML(formatDate(attempt.created_at))}

                        ·

                        ${escapeHTML(
                            formatDifficulty(
                                attempt.difficulty
                            )
                        )}

                        ·

                        ${escapeHTML(
                            getFocusLabel(attempt)
                        )}

                    </div>

                </div>


                <div class="history-score">

                    ${escapeHTML(scoreText)}

                </div>

            </div>


            <div class="history-actions">

                <button
                    type="button"
                    class="review-btn"
                    data-index="${index}"
                >
                    Review
                </button>

                <button
                    type="button"
                    class="delete-history-btn"
                    data-index="${index}"
                >
                    Delete
                </button>

            </div>

        `;


        historyList.appendChild(card);
    });


    // =============================
    // REVIEW BUTTONS
    // =============================

    historyList
        .querySelectorAll(".review-btn")
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            button.dataset.index
                        );

                    const attempt =
                        history[index];

                    if (!attempt) {
                        return;
                    }


                    sessionStorage.setItem(
                        "atomikResults",
                        JSON.stringify({

                            score:
                                attempt.score ?? 0,

                            total:
                                Array.isArray(
                                    attempt.questions
                                )
                                    ? attempt.questions.length
                                    : attempt.question_count,

                            questions:
                                attempt.questions || [],

                            userAnswers:
                                getSelectedValues(
                                    attempt
                                ),

                            selectedIndices:
                                getSelectedValues(
                                    attempt
                                ),

                            selectedValues:
                                getSelectedValues(
                                    attempt
                                ),

                            metadata: {

                                title:
                                    attempt.title ||
                                    "Atomik Quiz",

                                questionCount:
                                    attempt.question_count,

                                difficulty:
                                    attempt.difficulty,

                                questionType:
                                    attempt.question_type,

                                focus:
                                    attempt.focus,

                                topic:
                                    attempt.topic,

                                fileName:
                                    attempt.title

                            }

                        })
                    );


                    window.location.href =
                        "results.html";
                }
            );
        });


    // =============================
    // DELETE BUTTONS
    // =============================

    historyList
        .querySelectorAll(".delete-history-btn")
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            button.dataset.index
                        );

                    deleteHistoryItem(
                        index,
                        button
                    );
                }
            );
        });
}


// =============================
// DELETE INDIVIDUAL QUIZ
// =============================

async function deleteHistoryItem(
    index,
    button
) {

    const attempt = history[index];

    if (!attempt) {
        return;
    }


    const confirmed =
        await showConfirmModal({

            title: "Delete Quiz?",

            message:
                "This quiz will be permanently removed from your history.",

            confirmText: "Delete",

            icon: "!"
        });


    if (!confirmed) {
        return;
    }


    button.disabled = true;
    button.textContent = "Deleting...";


    try {

        const {
            data: {
                user
            }
        } = await supabase.auth.getUser();


        if (!user) {

            window.location.href =
                "auth.html";

            return;
        }


        const {
            error
        } = await supabase
            .from("quizzes")
            .delete()
            .eq("id", attempt.id)
            .eq("user_id", user.id);


        if (error) {
            throw error;
        }


        history.splice(index, 1);

        displayHistory();

    } catch (error) {

        console.error(
            "Failed to delete quiz:",
            error
        );

        alert(
            "Failed to delete this quiz. Please try again."
        );

        button.disabled = false;
        button.textContent = "Delete";
    }
}


// =============================
// CLEAR ALL HISTORY
// =============================

clearHistoryBtn.addEventListener(
    "click",
    async () => {

        if (history.length === 0) {
            return;
        }


        const confirmed =
            await showConfirmModal({

                title: "Clear All History?",

                message:
                    "Every quiz in your Atomik history will be permanently deleted. This cannot be undone.",

                confirmText: "Clear History",

                icon: "!"
            });


        if (!confirmed) {
            return;
        }


        clearHistoryBtn.disabled = true;
        clearHistoryBtn.textContent =
            "Clearing...";


        try {

            const {
                data: {
                    user
                }
            } = await supabase.auth.getUser();


            if (!user) {

                window.location.href =
                    "auth.html";

                return;
            }


            const {
                error
            } = await supabase
                .from("quizzes")
                .delete()
                .eq("user_id", user.id);


            if (error) {
                throw error;
            }


            history = [];

            displayHistory();

        } catch (error) {

            console.error(
                "Failed to clear history:",
                error
            );

            alert(
                "Failed to clear history. Please try again."
            );

        } finally {

            clearHistoryBtn.disabled = false;

            clearHistoryBtn.textContent =
                "Clear History";
        }
    }
);


// =============================
// HTML ESCAPE
// =============================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =============================
// AUTH STATE
// =============================

supabase.auth.onAuthStateChange(
    (event) => {

        if (event === "SIGNED_OUT") {
            window.location.href =
                "auth.html";
        }
    }
);


// =============================
// START
// =============================

loadHistory();