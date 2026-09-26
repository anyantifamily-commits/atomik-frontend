import { supabase } from "./supabase.js";

const TEST_MODE = true;
const API_URL = "https://atomik-server.onrender.com";
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const allowedExtensions = [
    "pdf",
    "doc",
    "docx",
    "pptx",
    "txt"
];

let selectedFile = null;
let remainingGenerations = 0;
let usageLoaded = false;
let isGenerating = false;
let isPremium = false;


/* =========================================================
   ELEMENTS
========================================================= */

const fileInput = document.getElementById("fileInput");
const uploadArea = document.getElementById("uploadArea");
const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");

const quizFocus = document.getElementById("quizFocus");
const topicGroup = document.getElementById("topicGroup");
const topicInput = document.getElementById("topicInput");

const questionCount = document.getElementById("questionCount");
const difficulty = document.getElementById("difficulty");
const questionType = document.getElementById("questionType");

const remaining = document.getElementById("remaining");

const authButton = document.getElementById("authButton");
const generateButton = document.querySelector(".generate-button");

const generationOverlay = document.getElementById("generationOverlay");
const generationTitle = document.getElementById("generationTitle");
const generationMessage = document.getElementById("generationMessage");
const generationProgress = document.getElementById("generationProgress");
const generationStatus = document.getElementById("generationStatus");

const errorOverlay = document.getElementById("errorOverlay");
const errorTitle = document.getElementById("errorTitle");
const errorMessage = document.getElementById("errorMessage");
const errorRetryBtn = document.getElementById("errorRetryBtn");
const errorCloseBtn = document.getElementById("errorCloseBtn");


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        initialize();
    }
);


async function initialize() {

    setupUpload();
    setupFocus();
    setupErrorButtons();
    setupAuthButton();
    setupPaystackButtons();

    /*
       Generate button already uses:

       onclick="generateQuiz()"

       So we do NOT attach another click listener.
    */

    await loadUser();

}


/* =========================================================
   AUTH / USAGE
========================================================= */

async function loadUser() {

    try {

        const {
            data: { user }
        } = await supabase.auth.getUser();


        if (!user) {

            authButton.textContent = "Sign In";

            authButton.onclick = () => {
                window.location.href = "auth.html";
            };

            isPremium = false;

            setRemainingGenerations(0);

            usageLoaded = false;

            return;

        }


        const displayName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Account";


        authButton.textContent =
            displayName;


        authButton.onclick = () => {
            window.location.href = "account.html";
        };


        await loadUsage();

    } catch (error) {

        console.error(
            "Auth error:",
            error
        );


        authButton.textContent =
            "Sign In";


        authButton.onclick = () => {
            window.location.href = "auth.html";
        };

    }

}


async function loadUsage() {

    try {

        const {
            data: { session }
        } = await supabase.auth.getSession();


        if (!session?.access_token) {

            usageLoaded = false;

            return false;

        }


        const response =
            await fetch(
                `${API_URL}/usage`,
                {
                    method: "GET",

                    headers: {
                        Authorization:
                            `Bearer ${session.access_token}`
                    }
                }
            );


        let usageData = null;


        try {

            usageData =
                await response.json();

        } catch {

            usageData = null;

        }


        if (!response.ok) {

            throw new Error(
                usageData?.error ||
                `Unable to load usage (${response.status}).`
            );

        }


        if (!usageData?.success) {

            throw new Error(
                usageData?.error ||
                "Unable to load Atomik usage."
            );

        }


        /*
         * PREMIUM USERS
         *
         * The backend returns:
         *
         * unlimited: true
         * remaining: null
         * limit: null
         */

        if (
            usageData.unlimited === true
        ) {

            isPremium = true;

            /*
             * Infinity lets the existing
             * quota check remain safe.
             */

            remainingGenerations =
                Number.POSITIVE_INFINITY;


            if (remaining) {

                remaining.textContent =
                    "∞";

            }


            usageLoaded = true;

            return true;

        }


        /*
         * FREE USERS
         */

        isPremium = false;


        if (
            typeof usageData.remaining !==
            "number"
        ) {

            throw new Error(
                "The server returned an invalid usage value."
            );

        }


        setRemainingGenerations(
            usageData.remaining
        );


        usageLoaded = true;


        return true;

    } catch (error) {

        console.error(
            "Usage loading error:",
            error
        );


        usageLoaded = false;
        isPremium = false;


        return false;

    }

}


function setRemainingGenerations(value) {

    const numericValue =
        Number(value);


    remainingGenerations =
        Number.isFinite(
            numericValue
        )
            ? Math.max(
                numericValue,
                0
            )
            : 0;


    if (remaining) {

        remaining.textContent =
            String(
                remainingGenerations
            );

    }

}


/* =========================================================
   GENERATING STATE
========================================================= */

function setGeneratingState(
    generating
) {

    isGenerating =
        generating;


    if (!generateButton) return;


    generateButton.disabled =
        generating;


    if (generating) {

        if (
            !generateButton.dataset.originalText
        ) {

            generateButton.dataset.originalText =
                generateButton.innerHTML;

        }


        generateButton.innerHTML =
            `<span>◌</span> Generating...`;


        generateButton.style.opacity =
            "0.75";


        generateButton.style.cursor =
            "wait";

    } else {

        if (
            generateButton.dataset.originalText
        ) {

            generateButton.innerHTML =
                generateButton.dataset.originalText;


            delete generateButton.dataset.originalText;

        }


        generateButton.style.opacity =
            "";


        generateButton.style.cursor =
            "";

    }

}


/* =========================================================
   FILE UPLOAD
========================================================= */

function setupUpload() {

    if (!fileInput) return;


    fileInput.addEventListener(
        "change",
        () => {

            const file =
                fileInput.files?.[0];


            if (file) {

                handleFile(file);

            }

        }
    );


    if (!uploadArea) return;


    uploadArea.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

            uploadArea.classList.add(
                "dragging"
            );

        }
    );


    uploadArea.addEventListener(
        "dragleave",
        () => {

            uploadArea.classList.remove(
                "dragging"
            );

        }
    );


    uploadArea.addEventListener(
        "drop",
        event => {

            event.preventDefault();


            uploadArea.classList.remove(
                "dragging"
            );


            const file =
                event.dataTransfer?.files?.[0];


            if (file) {

                handleFile(file);

            }

        }
    );

}


function handleFile(file) {

    const extension =
        file.name
            .split(".")
            .pop()
            ?.toLowerCase();


    if (
        !extension ||
        !allowedExtensions.includes(
            extension
        )
    ) {

        showError(
            "Unsupported file",
            "Please upload a PDF, DOC, DOCX, PPTX or TXT file."
        );

        return;

    }


    if (
        file.size >
        MAX_FILE_SIZE
    ) {

        showError(
            "File too large",
            "Your file is larger than the 20 MB limit."
        );

        return;

    }


    selectedFile =
        file;


    if (fileName) {

        fileName.textContent =
            file.name;

    }


    if (fileSize) {

        fileSize.textContent =
            formatFileSize(
                file.size
            );

    }


    if (fileInfo) {

        fileInfo.classList.remove(
            "hidden"
        );

    }

}


function formatFileSize(bytes) {

    if (bytes < 1024) {

        return `${bytes} B`;

    }


    if (
        bytes <
        1024 * 1024
    ) {

        return `${(
            bytes / 1024
        ).toFixed(1)} KB`;

    }


    return `${(
        bytes /
        (1024 * 1024)
    ).toFixed(2)} MB`;

}


function removeFile() {

    if (isGenerating) return;


    selectedFile =
        null;


    if (fileInput) {

        fileInput.value =
            "";

    }


    if (fileInfo) {

        fileInfo.classList.add(
            "hidden"
        );

    }


    if (fileName) {

        fileName.textContent =
            "File name";

    }


    if (fileSize) {

        fileSize.textContent =
            "File size";

    }

}


/* =========================================================
   FOCUS
========================================================= */

function setupFocus() {

    if (!quizFocus) return;


    quizFocus.addEventListener(
        "change",
        () => {

            if (isGenerating) return;


            if (
                quizFocus.value ===
                "topic"
            ) {

                if (topicGroup) {

                    topicGroup.style.display =
                        "block";

                }

            } else {

                if (topicGroup) {

                    topicGroup.style.display =
                        "none";

                }


                if (topicInput) {

                    topicInput.value =
                        "";

                }

            }

        }
    );

}


/* =========================================================
   LABEL HELPERS
========================================================= */

function getDifficultyLabel(
    value
) {

    const labels = {

        easy: "Easy",

        medium: "Medium",

        hard: "Hard",

        mixed: "Mixed"

    };


    return (
        labels[value] ||
        value ||
        "Medium"
    );

}


function getQuestionTypeLabel(
    value
) {

    const labels = {

        multiple_choice:
            "Multiple Choice",

        true_false:
            "True / False",

        mixed:
            "Mixed"

    };


    return (
        labels[value] ||
        "Multiple Choice"
    );

}


function getFocusLabel(
    focus,
    topic
) {

    if (
        focus === "topic" &&
        topic
    ) {

        return `Topic: ${topic}`;

    }


    return "Entire document";

}


/* =========================================================
   GENERATION UI
========================================================= */

function scrollToGenerator() {

    const generator =
        document.getElementById(
            "generator"
        );


    if (!generator) return;


    generator.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


function showGenerationOverlay() {

    if (!generationOverlay) return;


    generationOverlay.classList.add(
        "active"
    );


    generationOverlay.setAttribute(
        "aria-hidden",
        "false"
    );


    updateGenerationProgress(
        6,
        "Preparing your quiz...",
        "Atomik is getting everything ready.",
        "Preparing"
    );

}


function hideGenerationOverlay() {

    if (!generationOverlay) return;


    generationOverlay.classList.remove(
        "active"
    );


    generationOverlay.setAttribute(
        "aria-hidden",
        "true"
    );

}


function updateGenerationProgress(
    percent,
    title,
    message,
    status
) {

    if (generationProgress) {

        generationProgress.style.width =
            `${percent}%`;

    }


    if (generationTitle) {

        generationTitle.textContent =
            title;

    }


    if (generationMessage) {

        generationMessage.textContent =
            message;

    }


    if (generationStatus) {

        generationStatus.textContent =
            status;

    }

}


function updateGenerationSummary(
    count,
    selectedDifficulty,
    selectedQuestionType,
    focus,
    topic
) {

    const difficultyLabel =
        getDifficultyLabel(
            selectedDifficulty
        );


    const questionTypeLabel =
        getQuestionTypeLabel(
            selectedQuestionType
        );


    const focusLabel =
        getFocusLabel(
            focus,
            topic
        );


    const summary =
        `${count} questions • ${questionTypeLabel} • ${difficultyLabel} • ${focusLabel}`;


    if (generationMessage) {

        generationMessage.textContent =
            summary;

    }

}


/* =========================================================
   ERRORS
========================================================= */

function getFriendlyErrorMessage(
    error
) {

    const rawMessage =
        String(
            error?.message || ""
        ).trim();


    const message =
        rawMessage.toLowerCase();


    if (
        message.includes("failed to fetch") ||
        message.includes("networkerror") ||
        message.includes("network error") ||
        message.includes("load failed") ||
        message.includes("connection")
    ) {

        return {

            title:
                "Atomik is unreachable",

            message:
                "Atomik couldn't connect to the generation server. Please check your internet connection and try again."

        };

    }


    if (
        message.includes("session") ||
        message.includes("jwt") ||
        message.includes("token") ||
        message.includes("unauthorized") ||
        message.includes("authentication") ||
        message.includes("authenticated")
    ) {

        return {

            title:
                "Session expired",

            message:
                "Your Atomik session has expired. Please sign in again and continue generating your quiz."

        };

    }


    if (
        message.includes(
            "used all 3 free generations"
        ) ||
        message.includes(
            "no generations remaining"
        ) ||
        message.includes(
            "free generations"
        )
    ) {

        return {

            title:
                "No generations remaining",

            message:
                "You've used all 3 of your free generations. More generation options will be available when Atomik's usage plans are enabled."

        };

    }


    if (
        message.includes("429") ||
        message.includes("rate limit") ||
        message.includes("too many requests") ||
        message.includes("quota")
    ) {

        return {

            title:
                "Generation unavailable",

            message:
                "Atomik couldn't complete this generation because the service is currently limited. Please try again shortly."

        };

    }


    if (
        message.includes("500") ||
        message.includes("502") ||
        message.includes("503") ||
        message.includes("504")
    ) {

        return {

            title:
                "Atomik is temporarily unavailable",

            message:
                "The Atomik generation service isn't responding normally right now. Please try again in a moment."

        };

    }


    if (
        message.includes(
            "did not receive any questions"
        ) ||
        message.includes(
            "couldn't create a usable quiz"
        ) ||
        message.includes(
            "invalid usage"
        )
    ) {

        return {

            title:
                "Quiz generation failed",

            message:
                "Atomik couldn't create a usable quiz from this request. Please try again."

        };

    }


    return {

        title:
            "Something went wrong",

        message:
            rawMessage ||
            "Atomik couldn't complete your request. Please try again."

    };

}


function showError(
    title,
    message
) {

    hideGenerationOverlay();


    if (errorTitle) {

        errorTitle.textContent =
            title;

    }


    if (errorMessage) {

        errorMessage.textContent =
            message;

    }


    if (errorOverlay) {

        errorOverlay.classList.add(
            "active"
        );


        errorOverlay.setAttribute(
            "aria-hidden",
            "false"
        );

    }

}


function hideError() {

    if (!errorOverlay) return;


    errorOverlay.classList.remove(
        "active"
    );


    errorOverlay.setAttribute(
        "aria-hidden",
        "true"
    );

}


function setupErrorButtons() {

    if (errorCloseBtn) {

        errorCloseBtn.addEventListener(
            "click",
            () => {

                if (isGenerating) return;

                hideError();

            }
        );

    }


    if (errorRetryBtn) {

        errorRetryBtn.addEventListener(
            "click",
            async () => {

                if (isGenerating) return;

                hideError();

                await generateQuiz();

            }
        );

    }

}


/* =========================================================
   AUTH BUTTON
========================================================= */

function setupAuthButton() {

    if (!authButton) return;


    authButton.onclick = () => {

        window.location.href =
            "auth.html";

    };

}


/* =========================================================
   TEST QUIZ GENERATOR
========================================================= */

function generateTestQuiz(
    fileName,
    selectedQuestionType
) {

    const multipleChoiceQuestions = [

        {
            type:
                "multiple_choice",

            question:
                "Which organelle is primarily responsible for producing ATP in eukaryotic cells?",

            options: [

                {
                    value:
                        "mitochondrion",

                    label:
                        "Mitochondrion"
                },

                {
                    value:
                        "ribosome",

                    label:
                        "Ribosome"
                },

                {
                    value:
                        "nucleus",

                    label:
                        "Nucleus"
                },

                {
                    value:
                        "golgi",

                    label:
                        "Golgi apparatus"
                }

            ],

            correctValues:
                ["mitochondrion"],

            explanation:
                "Mitochondria are the main organelles responsible for producing ATP in eukaryotic cells."

        },


        {
            type:
                "multiple_choice",

            question:
                "Which molecule carries genetic information from DNA to the ribosome during protein synthesis?",

            options: [

                {
                    value:
                        "mRNA",

                    label:
                        "mRNA"
                },

                {
                    value:
                        "tRNA",

                    label:
                        "tRNA"
                },

                {
                    value:
                        "rRNA",

                    label:
                        "rRNA"
                },

                {
                    value:
                        "ATP",

                    label:
                        "ATP"
                }

            ],

            correctValues:
                ["mRNA"],

            explanation:
                "Messenger RNA carries genetic instructions from DNA to the ribosome."

        },


        {
            type:
                "multiple_choice",

            question:
                "Which nitrogenous base is found in RNA but not normally in DNA?",

            options: [

                {
                    value:
                        "uracil",

                    label:
                        "Uracil"
                },

                {
                    value:
                        "thymine",

                    label:
                        "Thymine"
                },

                {
                    value:
                        "adenine",

                    label:
                        "Adenine"
                },

                {
                    value:
                        "guanine",

                    label:
                        "Guanine"
                }

            ],

            correctValues:
                ["uracil"],

            explanation:
                "RNA normally contains uracil instead of thymine."

        },


        {
            type:
                "multiple_choice",

            question:
                "What level of protein structure is determined by the amino acid sequence?",

            options: [

                {
                    value:
                        "primary",

                    label:
                        "Primary structure"
                },

                {
                    value:
                        "secondary",

                    label:
                        "Secondary structure"
                },

                {
                    value:
                        "tertiary",

                    label:
                        "Tertiary structure"
                },

                {
                    value:
                        "quaternary",

                    label:
                        "Quaternary structure"
                }

            ],

            correctValues:
                ["primary"],

            explanation:
                "The primary structure of a protein is its specific sequence of amino acids."

        }

    ];


    const trueFalseQuestions = [

        {
            type:
                "true_false",

            question:
                "Mitochondria are involved in ATP production in eukaryotic cells.",

            options: [

                {
                    value:
                        "true",

                    label:
                        "True"
                },

                {
                    value:
                        "false",

                    label:
                        "False"
                }

            ],

            correctValues:
                ["true"],

            explanation:
                "Mitochondria are major sites of ATP production through cellular respiration."

        },


        {
            type:
                "true_false",

            question:
                "RNA normally contains thymine instead of uracil.",

            options: [

                {
                    value:
                        "true",

                    label:
                        "True"
                },

                {
                    value:
                        "false",

                    label:
                        "False"
                }

            ],

            correctValues:
                ["false"],

            explanation:
                "RNA normally contains uracil, while DNA normally contains thymine."

        },


        {
            type:
                "true_false",

            question:
                "Translation uses mRNA information to help produce a protein.",

            options: [

                {
                    value:
                        "true",

                    label:
                        "True"
                },

                {
                    value:
                        "false",

                    label:
                        "False"
                }

            ],

            correctValues:
                ["true"],

            explanation:
                "Translation uses the information in mRNA to direct protein synthesis."

        },


        {
            type:
                "true_false",

            question:
                "The primary structure of a protein refers to its amino acid sequence.",

            options: [

                {
                    value:
                        "true",

                    label:
                        "True"
                },

                {
                    value:
                        "false",

                    label:
                        "False"
                }

            ],

            correctValues:
                ["true"],

            explanation:
                "The primary structure is the linear sequence of amino acids in a protein."

        }

    ];


    let selectedQuestions;


    if (
        selectedQuestionType ===
        "true_false"
    ) {

        selectedQuestions =
            trueFalseQuestions;

    }

    else if (
        selectedQuestionType ===
        "mixed"
    ) {

        selectedQuestions = [

            multipleChoiceQuestions[0],

            trueFalseQuestions[0],

            multipleChoiceQuestions[1],

            trueFalseQuestions[1],

            multipleChoiceQuestions[2]

        ];

    }

    else {

        selectedQuestions =
            multipleChoiceQuestions;

    }


    return {

        title:
            fileName ||
            "Atomik Quiz",

        questions:
            selectedQuestions

    };

}


/* =========================================================
   NORMALIZE REAL AI QUIZ
========================================================= */

function normalizeApiQuiz(
    quiz
) {

    if (
        !quiz ||
        typeof quiz !== "object"
    ) {

        return null;

    }


    if (
        !Array.isArray(
            quiz.questions
        )
    ) {

        return quiz;

    }


    const normalizedQuestions =
        quiz.questions.map(
            (
                question
            ) => {

                if (
                    !question ||
                    typeof question !==
                        "object"
                ) {

                    return question;

                }


                const type =
                    question.type ||
                    (
                        Array.isArray(
                            question.options
                        ) &&
                        question.options.length === 2
                            ? "true_false"
                            : "multiple_choice"
                    );


                const normalizedOptions =
                    Array.isArray(
                        question.options
                    )
                        ? question.options.map(
                            (
                                option
                            ) => {

                                if (
                                    !option ||
                                    typeof option !==
                                        "object"
                                ) {

                                    return option;

                                }


                                const label =
                                    String(
                                        option.text ??
                                        option.label ??
                                        option.value ??
                                        ""
                                    ).trim();


                                const value =
                                    String(
                                        option.value ??
                                        label
                                    ).trim();


                                return {

                                    value:
                                        value,

                                    label:
                                        label

                                };

                            }
                        )
                        : [];


                const answer =
                    String(
                        question.answer ??
                        question.correctAnswer ??
                        question.correctAnswerValue ??
                        ""
                    ).trim();


                const correctOption =
                    normalizedOptions.find(
                        option =>
                            String(
                                option.label
                            )
                                .trim()
                                .toLowerCase() ===
                            answer.toLowerCase()
                    );


                const correctValues =
                    correctOption
                        ? [correctOption.value]
                        : [];


                return {

                    type:
                        type,

                    question:
                        question.question,

                    options:
                        normalizedOptions,

                    correctValues:
                        correctValues,

                    explanation:
                        question.explanation ||
                        ""

                };

            }
        );


    return {

        title:
            quiz.title ||
            "Atomik Quiz",

        questions:
            normalizedQuestions

    };

}


/* =========================================================
   QUIZ VALIDATION
========================================================= */

function validateQuizData(
    quizData
) {

    if (
        !quizData ||
        typeof quizData !== "object"
    ) {

        throw new Error(
            "Atomik couldn't create a usable quiz."
        );

    }


    if (
        typeof quizData.title !==
        "string"
    ) {

        throw new Error(
            "Atomik returned a quiz without a valid title."
        );

    }


    if (
        !Array.isArray(
            quizData.questions
        ) ||
        quizData.questions.length === 0
    ) {

        throw new Error(
            "Atomik couldn't create a usable quiz."
        );

    }


    for (
        let i = 0;
        i < quizData.questions.length;
        i++
    ) {

        const question =
            quizData.questions[i];


        if (
            !question ||
            typeof question !== "object"
        ) {

            throw new Error(
                `Question ${i + 1} is invalid.`
            );

        }


        if (
            typeof question.question !==
                "string" ||
            !question.question.trim()
        ) {

            throw new Error(
                `Question ${i + 1} is missing its question text.`
            );

        }


        /*
           Every question now needs
           an explicit type.
        */

        const type =
            question.type ||
            (
                Array.isArray(
                    question.options
                ) &&
                question.options.length === 2
                    ? "true_false"
                    : "multiple_choice"
            );


        if (
            ![
                "multiple_choice",
                "true_false"
            ].includes(type)
        ) {

            throw new Error(
                `Question ${i + 1} has an invalid question type.`
            );

        }


        question.type =
            type;


        if (
            !Array.isArray(
                question.options
            )
        ) {

            throw new Error(
                `Question ${i + 1} has invalid answer options.`
            );

        }


        const expectedOptions =
            type === "true_false"
                ? 2
                : 4;


        if (
            question.options.length !==
            expectedOptions
        ) {

            throw new Error(
                `Question ${i + 1} must contain exactly ${expectedOptions} options.`
            );

        }


        question.options.forEach(
            (
                option,
                optionIndex
            ) => {

                if (
                    !option ||
                    typeof option !==
                        "object"
                ) {

                    throw new Error(
                        `Question ${i + 1}, option ${optionIndex + 1} is invalid.`
                    );

                }


                if (
                    typeof option.label !==
                        "string" ||
                    !option.label.trim()
                ) {

                    throw new Error(
                        `Question ${i + 1}, option ${optionIndex + 1} is missing its text.`
                    );

                }

            }
        );


        if (
            !Array.isArray(
                question.correctValues
            ) ||
            question.correctValues.length === 0
        ) {

            throw new Error(
                `Question ${i + 1} is missing its correct answer.`
            );

        }

    }


    return true;

}


/* =========================================================
   SAVE QUIZ
========================================================= */

async function saveQuizToSupabase(
    quizData,
    metadata,
    user
) {

    const {
        data,
        error
    } =
        await supabase
            .from("quizzes")
            .insert({

                user_id:
                    user.id,

                title:
                    quizData.title ||
                    metadata.fileName ||
                    "Atomik Quiz",

                question_count:
                    quizData.questions.length,

                difficulty:
                    metadata.difficulty,

                question_type:
                    metadata.questionType,

                focus:
                    metadata.focus,

                topic:
                    metadata.topic ||
                    null,

                questions:
                    quizData.questions,

                score:
                    null,

                completed:
                    false,

                user_answers:
                    null,

                completed_at:
                    null

            })
            .select()
            .single();


    if (error) {

        throw error;

    }


    if (!data?.id) {

        throw new Error(
            "Atomik saved the quiz but did not receive a valid quiz ID."
        );

    }


    return data;

}


/* =========================================================
   DELETE QUIZ ROW
========================================================= */

async function deleteQuizRow(
    quizId
) {

    if (!quizId) return;


    try {

        const {
            error
        } =
            await supabase
                .from("quizzes")
                .delete()
                .eq(
                    "id",
                    quizId
                );


        if (error) {

            console.error(
                "Quiz cleanup error:",
                error
            );

        }

    } catch (error) {

        console.error(
            "Quiz cleanup exception:",
            error
        );

    }

}


/* =========================================================
   PREPARE QUIZ TRANSITION
========================================================= */

async function prepareQuizTransition(
    quizData,
    metadata,
    user
) {

    validateQuizData(
        quizData
    );


    const quizRow =
        await saveQuizToSupabase(
            quizData,
            metadata,
            user
        );


    try {

        sessionStorage.setItem(
            "atomikQuiz",
            JSON.stringify(
                quizData
            )
        );


        sessionStorage.setItem(
            "atomikQuizMetadata",
            JSON.stringify(
                metadata
            )
        );


        sessionStorage.setItem(
            "atomikQuizId",
            String(
                quizRow.id
            )
        );


        const storedQuiz =
            sessionStorage.getItem(
                "atomikQuiz"
            );


        const storedMetadata =
            sessionStorage.getItem(
                "atomikQuizMetadata"
            );


        const storedQuizId =
            sessionStorage.getItem(
                "atomikQuizId"
            );


        if (
            !storedQuiz ||
            !storedMetadata ||
            !storedQuizId
        ) {

            throw new Error(
                "Atomik couldn't prepare your quiz for the next page."
            );

        }


        const parsedQuiz =
            JSON.parse(
                storedQuiz
            );


        const parsedMetadata =
            JSON.parse(
                storedMetadata
            );


        validateQuizData(
            parsedQuiz
        );


        if (
            !parsedMetadata ||
            typeof parsedMetadata !==
                "object"
        ) {

            throw new Error(
                "Atomik couldn't prepare your quiz information."
            );

        }


        if (
            String(storedQuizId) !==
            String(quizRow.id)
        ) {

            throw new Error(
                "Atomik couldn't verify the generated quiz."
            );

        }


        return {

            quizRow,

            storageCompleted:
                true

        };

    } catch (error) {

        await deleteQuizRow(
            quizRow.id
        );

        throw error;

    }

}


/* =========================================================
   GENERATE QUIZ
========================================================= */

async function generateQuiz() {

    if (isGenerating) return;


    setGeneratingState(
        true
    );


    try {

        hideError();


        const {
            data: { user }
        } =
            await supabase.auth.getUser();


        if (!user) {

            showError(
                "Sign in required",
                "Please sign in to generate and save a quiz."
            );

            return;

        }


        if (!selectedFile) {

            showError(
                "No study material",
                "Please choose a study file before generating your quiz."
            );

            return;

        }


        const focus =
            quizFocus?.value ||
            "entire";


        const topic =
            topicInput?.value.trim() ||
            "";


        if (
            focus === "topic" &&
            !topic
        ) {

            showError(
                "Topic required",
                "Please enter the topic you want Atomik to focus on."
            );

            return;

        }


        const count =
            Number(
                questionCount?.value ||
                10
            );


        const selectedDifficulty =
            difficulty?.value ||
            "medium";


        const selectedQuestionType =
            questionType?.value ||
            "multiple_choice";


        const freshUsage =
            await loadUsage();


        if (!freshUsage) {

            showError(
                "Usage unavailable",
                "Atomik couldn't verify your remaining generations. Please try again."
            );

            return;

        }


        /*
         * Free users are blocked at zero.
         *
         * Premium users have unlimited
         * generations and therefore bypass
         * the numeric quota check.
         */

        if (
            !isPremium &&
            remainingGenerations <= 0
        ) {

            showError(
                "No generations remaining",
                "You have used all 3 free generations."
            );

            return;

        }


        showGenerationOverlay();


        updateGenerationSummary(
            count,
            selectedDifficulty,
            selectedQuestionType,
            focus,
            topic
        );


        await delay(
            350
        );


        updateGenerationProgress(
            18,
            "Reading your material...",
            `Preparing ${count} ${count === 1 ? "question" : "questions"} as ${getQuestionTypeLabel(selectedQuestionType)}.`,
            "Reading"
        );


        await delay(
            450
        );


        let quizData;


        /* =====================================================
           TEST MODE
        ===================================================== */

        if (TEST_MODE) {

            updateGenerationProgress(
                36,
                "Extracting key ideas...",
                "Atomik is identifying useful knowledge from your material.",
                "Analyzing"
            );


            await delay(
                650
            );


            updateGenerationProgress(
                58,
                "Building your questions...",
                `Creating your ${getQuestionTypeLabel(selectedQuestionType).toLowerCase()} practice set.`,
                "Generating"
            );


            await delay(
                650
            );


            const testQuiz =
                generateTestQuiz(
                    selectedFile.name,
                    selectedQuestionType
                );


            const questions =
                testQuiz.questions.slice(
                    0,
                    Math.min(
                        count,
                        testQuiz.questions.length
                    )
                );


            quizData = {

                title:
                    testQuiz.title,

                questions:
                    questions

            };

        }


        /* =====================================================
           REAL AI MODE
        ===================================================== */

        else {

            updateGenerationProgress(
                30,
                "Preparing your material...",
                `Sending your ${formatFileSize(selectedFile.size)} study file to Atomik.`,
                "Preparing"
            );


            const formData =
                new FormData();


            formData.append(
                "file",
                selectedFile
            );


            formData.append(
                "questionCount",
                String(count)
            );


            formData.append(
                "difficulty",
                selectedDifficulty
            );


            formData.append(
                "questionType",
                selectedQuestionType
            );


            formData.append(
                "focus",
                focus
            );


            if (
                focus === "topic"
            ) {

                formData.append(
                    "topic",
                    topic
                );

            }


            await delay(
                250
            );


            updateGenerationProgress(
                48,
                "Generating questions...",
                `Atomik is turning your material into ${count} questions.`,
                "Generating"
            );


            const {
                data: { session }
            } =
                await supabase.auth.getSession();


            if (
                !session?.access_token
            ) {

                throw new Error(
                    "Your login session has expired. Please sign in again."
                );

            }


            const response =
                await fetch(
                    `${API_URL}/generate-quiz`,
                    {

                        method:
                            "POST",

                        headers: {

                            Authorization:
                                `Bearer ${session.access_token}`

                        },

                        body:
                            formData

                    }
                );


            let apiData =
                null;


            try {

                apiData =
                    await response.json();

            } catch {

                apiData =
                    null;

            }


            if (!response.ok) {

                await loadUsage();


                let message =
                    `Generation failed (${response.status}).`;


                if (
                    apiData?.error
                ) {

                    message =
                        apiData.error;

                }


                throw new Error(
                    message
                );

            }


            updateGenerationProgress(
                72,
                "Checking your quiz...",
                "Atomik is making sure the generated questions are usable.",
                "Checking"
            );


            /*
               The backend returns:

               options[].text
               answer

               while the frontend quiz engine uses:

               options[].label
               correctValues

               Normalize the backend response before
               passing it into the frontend validator.
            */

            quizData =
                normalizeApiQuiz(
                    apiData?.quiz
                );


            if (
                !quizData ||
                !Array.isArray(
                    quizData.questions
                ) ||
                quizData.questions.length === 0
            ) {

                throw new Error(
                    "Atomik did not receive any questions from the server."
                );

            }


            if (
                !quizData.title ||
                !quizData.title.trim()
            ) {

                quizData.title =
                    selectedFile.name;

            }


            await loadUsage();

        }


        /* =====================================================
           VALIDATE
        ===================================================== */

        validateQuizData(
            quizData
        );


        /* =====================================================
           METADATA
        ===================================================== */

        const metadata = {

            difficulty:
                selectedDifficulty,

            questionType:
                selectedQuestionType,

            focus:
                focus,

            topic:
                focus === "topic"
                    ? topic
                    : "",

            fileName:
                selectedFile.name,

            fileSize:
                selectedFile.size,

            questionCount:
                quizData.questions.length

        };


        /* =====================================================
           SAVE
        ===================================================== */

        updateGenerationProgress(
            84,
            "Saving your quiz...",
            "Your quiz is being prepared for your quiz session.",
            "Saving"
        );


        const transition =
            await prepareQuizTransition(
                quizData,
                metadata,
                user
            );


        if (
            !transition?.quizRow?.id ||
            transition.storageCompleted !==
                true
        ) {

            throw new Error(
                "Atomik couldn't finish preparing your quiz."
            );

        }


        updateGenerationProgress(
            100,
            "Your quiz is ready!",
            "Let's see what you know.",
            "Complete"
        );


        await delay(
            650
        );


        window.location.href =
            "quiz.html";


    } catch (error) {

        console.error(
            "Quiz generation error:",
            error
        );


        await loadUsage();


        const friendlyError =
            getFriendlyErrorMessage(
                error
            );


        showError(
            friendlyError.title,
            friendlyError.message
        );

    } finally {

        hideGenerationOverlay();

        setGeneratingState(
            false
        );

    }

}


/* =========================================================
   WATCH AD
========================================================= */

function watchAd() {

    if (isGenerating) return;


    showError(
        "Ads are coming soon",
        "The ad system will be connected when Atomik is ready for public use."
    );

}


/* =========================================================
   PAYSTACK SUBSCRIPTIONS
========================================================= */

function setupPaystackButtons() {

    const subscribeButtons =
        document.querySelectorAll(
            ".subscribe-button[data-plan]"
        );


    subscribeButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const plan =
                        button.dataset.plan;

                    startPaystackCheckout(
                        plan,
                        button
                    );

                }
            );

        }
    );

}


async function startPaystackCheckout(
    plan,
    button
) {

    if (
        plan !== "monthly" &&
        plan !== "yearly"
    ) {

        showError(
            "Invalid plan",
            "Atomik couldn't identify the selected subscription plan."
        );

        return;

    }


    if (
        !button ||
        button.disabled
    ) {

        return;

    }


    try {

        const {
            data: { user }
        } =
            await supabase.auth.getUser();


        if (!user) {

            showError(
                "Sign in required",
                "Please sign in to Atomik before subscribing to a paid plan."
            );

            return;

        }


        const {
            data: { session }
        } =
            await supabase.auth.getSession();


        if (
            !session?.access_token
        ) {

            throw new Error(
                "Your login session has expired. Please sign in again."
            );

        }


        button.dataset.originalText =
            button.innerHTML;


        button.disabled =
            true;


        button.innerHTML =
            "Connecting to Paystack...";


        const response =
            await fetch(
                `${API_URL}/paystack/initialize`,
                {

                    method:
                        "POST",

                    headers: {

                        "Authorization":
                            `Bearer ${session.access_token}`,

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({
                            plan
                        })

                }
            );


        let data =
            null;


        try {

            data =
                await response.json();

        } catch {

            data =
                null;

        }


        if (!response.ok) {

            throw new Error(
                data?.error ||
                `Unable to initialize payment (${response.status}).`
            );

        }


        if (
            !data?.success ||
            !data?.authorization_url
        ) {

            throw new Error(
                data?.error ||
                "Atomik couldn't create the Paystack checkout."
            );

        }


        /*
         * Keep the transaction reference
         * locally for the post-payment flow.
         */

        if (
            data.reference
        ) {

            sessionStorage.setItem(
                "atomikPaystackReference",
                String(
                    data.reference
                )
            );

        }


        /*
         * Backend initializes the transaction.
         * Atomik then redirects the customer
         * to Paystack's hosted checkout.
         */

        window.location.href =
            data.authorization_url;


    } catch (error) {

        console.error(
            "Paystack checkout error:",
            error
        );


        showError(
            "Payment couldn't start",
            error?.message ||
            "Atomik couldn't connect you to Paystack. Please try again."
        );


        button.disabled =
            false;


        button.innerHTML =
            button.dataset.originalText ||
            (
                plan === "monthly"
                    ? "Subscribe — ₦1,500/month"
                    : "Get Yearly Plan"
            );

    }

}


/* =========================================================
   DELAY
========================================================= */

function delay(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );

}


/* =========================================================
   GLOBAL FUNCTIONS
========================================================= */

window.scrollToGenerator =
    scrollToGenerator;

window.removeFile =
    removeFile;

window.generateQuiz =
    generateQuiz;

window.watchAd =
    watchAd;