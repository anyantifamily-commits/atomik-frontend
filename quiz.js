import { supabase } from "./supabase.js";


/* =========================================================
   ATOMIK QUIZ ENGINE
========================================================= */


/* =========================================================
   LOAD QUIZ
========================================================= */

const savedQuiz =
    sessionStorage.getItem(
        "atomikQuiz"
    );


let questions = [];

let quizTitle =
    "Atomik Quiz";

let quizLoadFailed =
    false;

let isFinishing =
    false;


/* =========================================================
   FALLBACK QUIZ
========================================================= */

const fallbackQuestions = [

    {
        type:
            "multiple_choice",

        question:
            "Which molecule carries genetic information from DNA to the ribosome?",

        options: [

            {
                value:
                    "A",

                label:
                    "mRNA"
            },

            {
                value:
                    "B",

                label:
                    "tRNA"
            },

            {
                value:
                    "C",

                label:
                    "ATP"
            },

            {
                value:
                    "D",

                label:
                    "Lipase"
            }

        ],

        correctValues:
            ["A"],

        difficulty:
            "EASY",

        explanation:
            "Messenger RNA (mRNA) carries genetic instructions from DNA to the ribosome for protein synthesis."

    },


    {
        type:
            "true_false",

        question:
            "Transcription is the process by which DNA is used to produce RNA.",

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

        difficulty:
            "MEDIUM",

        explanation:
            "Transcription is the process in which RNA is synthesized using DNA as a template."

    },


    {
        type:
            "multiple_choice",

        question:
            "Which molecule carries amino acids to the ribosome during translation?",

        options: [

            {
                value:
                    "A",

                label:
                    "mRNA"
            },

            {
                value:
                    "B",

                label:
                    "tRNA"
            },

            {
                value:
                    "C",

                label:
                    "DNA"
            },

            {
                value:
                    "D",

                label:
                    "rRNA"
            }

        ],

        correctValues:
            ["B"],

        difficulty:
            "MEDIUM",

        explanation:
            "Transfer RNA carries specific amino acids to the ribosome during translation."

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

        difficulty:
            "EASY",

        explanation:
            "RNA normally contains uracil, while DNA normally contains thymine."

    }

];


/* =========================================================
   BASIC QUESTION VALIDATION
========================================================= */

function validateQuestion(
    question,
    index
) {

    if (
        !question ||
        typeof question !==
            "object"
    ) {

        throw new Error(
            `Question ${index + 1} is invalid.`
        );

    }


    if (
        typeof question.question !==
            "string" ||
        !question.question.trim()
    ) {

        throw new Error(
            `Question ${index + 1} has no valid question text.`
        );

    }


    /*
       Determine question type.

       Older quizzes without a type are
       still supported.
    */

    let type =
        question.type;


    if (!type) {

        if (
            Array.isArray(
                question.options
            ) &&
            question.options.length === 2
        ) {

            type =
                "true_false";

        } else {

            type =
                "multiple_choice";

        }

    }


    if (
        ![
            "multiple_choice",
            "true_false"
        ].includes(type)
    ) {

        throw new Error(
            `Question ${index + 1} has an invalid question type.`
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
            `Question ${index + 1} has no valid answer options.`
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
            `Question ${index + 1} must contain exactly ${expectedOptions} answer options.`
        );

    }


    question.options.forEach(
        (
            option,
            optionIndex
        ) => {

            if (
                option === null ||
                option === undefined
            ) {

                throw new Error(
                    `Question ${index + 1}, option ${optionIndex + 1} is invalid.`
                );

            }


            let text =
                "";


            if (
                typeof option ===
                    "object"
            ) {

                text =
                    option.label ??
                    option.text ??
                    option.value ??
                    option.answer ??
                    "";

            } else {

                text =
                    String(option);

            }


            if (
                !String(text).trim()
            ) {

                throw new Error(
                    `Question ${index + 1}, option ${optionIndex + 1} has no valid text.`
                );

            }

        }
    );


    if (
        !Array.isArray(
            question.correctValues
        ) &&
        question.answer ===
            undefined &&
        question.correctAnswer ===
            undefined &&
        question.correctAnswerValue ===
            undefined &&
        question.answerKey ===
            undefined &&
        question.correct ===
            undefined
    ) {

        throw new Error(
            `Question ${index + 1} has no recognizable correct answer.`
        );

    }


    return true;

}


/* =========================================================
   VALIDATE QUIZ
========================================================= */

function validateQuiz(
    quiz
) {

    if (
        !quiz ||
        typeof quiz !==
            "object"
    ) {

        throw new Error(
            "Invalid quiz data."
        );

    }


    if (
        !Array.isArray(
            quiz.questions
        ) ||
        quiz.questions.length === 0
    ) {

        throw new Error(
            "The quiz contains no valid questions."
        );

    }


    quiz.questions.forEach(
        (
            question,
            index
        ) => {

            validateQuestion(
                question,
                index
            );

        }
    );


    return true;

}


/* =========================================================
   LOAD SAVED QUIZ
========================================================= */

if (savedQuiz) {

    try {

        const parsedQuiz =
            JSON.parse(
                savedQuiz
            );


        if (
            parsedQuiz &&
            Array.isArray(
                parsedQuiz.questions
            )
        ) {

            validateQuiz(
                parsedQuiz
            );


            questions =
                parsedQuiz.questions;


            quizTitle =
                typeof parsedQuiz.title ===
                    "string" &&
                parsedQuiz.title.trim()
                    ? parsedQuiz.title
                    : "Atomik Quiz";

        }


        else if (
            Array.isArray(
                parsedQuiz
            )
        ) {

            /*
               Legacy support.
            */

            const legacyQuiz = {

                title:
                    "Atomik Quiz",

                questions:
                    parsedQuiz

            };


            validateQuiz(
                legacyQuiz
            );


            questions =
                parsedQuiz;

        }


        else {

            throw new Error(
                "Invalid quiz structure."
            );

        }

    } catch (error) {

        console.error(
            "Quiz loading error:",
            error
        );


        quizLoadFailed =
            true;


        sessionStorage.removeItem(
            "atomikQuiz"
        );


        alert(
            "The saved quiz could not be loaded. Please generate a new quiz."
        );


        window.location.href =
            "index.html";

    }

}


/* =========================================================
   FALLBACK
========================================================= */

if (
    !quizLoadFailed &&
    questions.length === 0
) {

    console.warn(
        "No saved quiz found. Using fallback quiz."
    );


    questions =
        fallbackQuestions;


    quizTitle =
        "Atomik Test Quiz";

}


/* =========================================================
   NORMALIZE QUESTIONS
========================================================= */

if (!quizLoadFailed) {

    questions =
        questions
            .filter(
                question =>
                    question &&
                    typeof question ===
                        "object"
            )
            .map(
                question => {

                    /*
                       Infer question type for
                       older quiz structures.
                    */

                    if (
                        !question.type
                    ) {

                        question.type =
                            Array.isArray(
                                question.options
                            ) &&
                            question.options.length ===
                                2
                                ? "true_false"
                                : "multiple_choice";

                    }


                    if (
                        Array.isArray(
                            question.options
                        )
                    ) {

                        question.options =
                            question.options.map(
                                (
                                    option,
                                    index
                                ) => {

                                    /* =============================
                                       OBJECT OPTION
                                    ============================= */

                                    if (
                                        option &&
                                        typeof option ===
                                            "object"
                                    ) {

                                        const answerKey =
                                            option.answer ??
                                            option.value ??
                                            (
                                                question.type ===
                                                "true_false"

                                                    ? (
                                                        index === 0
                                                            ? "true"
                                                            : "false"
                                                    )

                                                    : String.fromCharCode(
                                                        65 + index
                                                    )
                                            );


                                        const optionText =
                                            option.label ??
                                            option.text ??
                                            option.value ??
                                            option.answer ??
                                            "";


                                        return {

                                            ...option,

                                            value:
                                                String(
                                                    answerKey
                                                ),

                                            label:
                                                String(
                                                    optionText
                                                )

                                        };

                                    }


                                    /* =============================
                                       STRING OPTION
                                    ============================= */

                                    return {

                                        value:
                                            question.type ===
                                            "true_false"

                                                ? (
                                                    index === 0
                                                        ? "true"
                                                        : "false"
                                                )

                                                : String.fromCharCode(
                                                    65 + index
                                                ),

                                        label:
                                            String(
                                                option
                                            )

                                    };

                                }
                            );

                    }


                    return question;

                }
            );

}


/* =========================================================
   FINAL QUESTION SAFETY CHECK
========================================================= */

if (
    !quizLoadFailed &&
    questions.length === 0
) {

    alert(
        "No valid quiz questions were found. Please generate a new quiz."
    );


    window.location.href =
        "index.html";

}


/* =========================================================
   QUIZ STATE
========================================================= */

let currentQuestion =
    0;


const userAnswers =
    new Array(
        questions.length
    ).fill(null);


/* =========================================================
   DOM ELEMENTS
========================================================= */

const questionElement =
    document.getElementById(
        "question"
    );


const answersElement =
    document.getElementById(
        "answers"
    );


const questionCountElement =
    document.getElementById(
        "questionCount"
    );


const progressBar =
    document.getElementById(
        "progressBar"
    );


const difficultyElement =
    document.getElementById(
        "difficulty"
    );


const previousBtn =
    document.getElementById(
        "previousBtn"
    );


const nextBtn =
    document.getElementById(
        "nextBtn"
    );


/* =========================================================
   DOM SAFETY CHECK
========================================================= */

if (
    !questionElement ||
    !answersElement ||
    !questionCountElement ||
    !progressBar ||
    !difficultyElement ||
    !previousBtn ||
    !nextBtn
) {

    console.error(
        "Atomik Quiz: required HTML elements are missing."
    );

}


/* =========================================================
   SAFE QUESTION INDEX
========================================================= */

function isValidQuestionIndex(
    index
) {

    return (

        Number.isInteger(
            index
        ) &&

        index >= 0 &&

        index <
            questions.length

    );

}


/* =========================================================
   DISPLAY QUESTION
========================================================= */

function displayQuestion() {

    if (
        !isValidQuestionIndex(
            currentQuestion
        )
    ) {

        console.error(
            "Atomik Quiz: invalid question index.",
            currentQuestion
        );


        currentQuestion =
            0;


        if (
            questions.length === 0
        ) {

            alert(
                "This quiz contains no usable questions."
            );


            window.location.href =
                "index.html";


            return;

        }

    }


    const question =
        questions[
            currentQuestion
        ];


    if (!question) {

        console.error(
            "Atomik Quiz: question not found.",
            currentQuestion
        );


        return;

    }


    /* =====================================================
       QUESTION
    ===================================================== */

    questionElement.textContent =
        question.question ||
        "Question unavailable.";


    /* =====================================================
       DIFFICULTY
    ===================================================== */

    difficultyElement.textContent =
        String(
            question.difficulty ||
            "MEDIUM"
        ).toUpperCase();


    /* =====================================================
       COUNTER
    ===================================================== */

    questionCountElement.textContent =
        `Question ${
            currentQuestion + 1
        } of ${
            questions.length
        }`;


    /* =====================================================
       PROGRESS
    ===================================================== */

    const progress =
        (
            (
                currentQuestion + 1
            )
            /
            questions.length
        ) * 100;


    progressBar.style.width =
        `${progress}%`;


    /* =====================================================
       CLEAR ANSWERS
    ===================================================== */

    answersElement.innerHTML =
        "";


    /* =====================================================
       QUESTION TYPE CLASS
    ===================================================== */

    answersElement.classList.toggle(
        "true-false",
        question.type ===
            "true_false"
    );


    /* =====================================================
       CREATE ANSWERS
    ===================================================== */

    if (
        !Array.isArray(
            question.options
        )
    ) {

        answersElement.innerHTML = `
            <p>
                This question has invalid answer options.
            </p>
        `;


        return;

    }


    const expectedOptions =
        question.type ===
            "true_false"
            ? 2
            : 4;


    if (
        question.options.length !==
        expectedOptions
    ) {

        answersElement.innerHTML = `
            <p>
                This question has invalid answer options.
            </p>
        `;


        return;

    }


    question.options.forEach(
        (
            option,
            index
        ) => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "answer-btn";


            /*
               Add a class specifically
               for True/False buttons.
            */

            if (
                question.type ===
                "true_false"
            ) {

                button.classList.add(
                    "true-false-answer"
                );

            }


            /* =============================================
               RESTORE SELECTED ANSWER
            ============================================= */

            if (
                userAnswers[
                    currentQuestion
                ] === index
            ) {

                button.classList.add(
                    "selected"
                );

            }


            /* =============================================
               LETTER / SYMBOL
            ============================================= */

            const letter =
                document.createElement(
                    "span"
                );


            letter.className =
                "answer-letter";


            if (
                question.type ===
                "true_false"
            ) {

                letter.textContent =
                    index === 0
                        ? "✓"
                        : "✕";

            } else {

                letter.textContent =
                    String.fromCharCode(
                        65 + index
                    );

            }


            /* =============================================
               TEXT
            ============================================= */

            const text =
                document.createElement(
                    "span"
                );


            text.textContent =
                option?.label ??
                option?.text ??
                option?.value ??
                String(option);


            /* =============================================
               BUILD BUTTON
            ============================================= */

            button.appendChild(
                letter
            );


            button.appendChild(
                text
            );


            /* =============================================
               CLICK
            ============================================= */

            button.addEventListener(
                "click",
                () => {

                    if (
                        isFinishing
                    ) {

                        return;

                    }


                    selectAnswer(
                        index
                    );

                }
            );


            answersElement.appendChild(
                button
            );

        }
    );


    /* =====================================================
       PREVIOUS
    ===================================================== */

    previousBtn.disabled =
        currentQuestion ===
            0 ||
        isFinishing;


    /* =====================================================
       NEXT / FINISH
    ===================================================== */

    nextBtn.disabled =
        isFinishing;


    if (
        currentQuestion ===
        questions.length - 1
    ) {

        nextBtn.innerHTML =
            `Finish <span>✓</span>`;

    } else {

        nextBtn.innerHTML =
            `Next <span>→</span>`;

    }

}


/* =========================================================
   SELECT ANSWER
========================================================= */

function selectAnswer(
    index
) {

    if (
        isFinishing
    ) {

        return;

    }


    if (
        !isValidQuestionIndex(
            currentQuestion
        )
    ) {

        return;

    }


    const question =
        questions[
            currentQuestion
        ];


    if (
        !Array.isArray(
            question?.options
        ) ||
        index < 0 ||
        index >=
            question.options.length
    ) {

        return;

    }


    userAnswers[
        currentQuestion
    ] =
        index;


    displayQuestion();

}


/* =========================================================
   PREVIOUS
========================================================= */

previousBtn.addEventListener(
    "click",
    () => {

        if (
            isFinishing
        ) {

            return;

        }


        if (
            currentQuestion >
            0
        ) {

            currentQuestion--;


            displayQuestion();

        }

    }
);


/* =========================================================
   NEXT / FINISH
========================================================= */

nextBtn.addEventListener(
    "click",
    async () => {

        if (
            isFinishing
        ) {

            return;

        }


        if (
            userAnswers[
                currentQuestion
            ] === null
        ) {

            alert(
                "Please select an answer first."
            );


            return;

        }


        if (
            currentQuestion ===
            questions.length - 1
        ) {

            await finishQuiz();


            return;

        }


        currentQuestion++;


        displayQuestion();

    }
);


/* =========================================================
   GET OPTION VALUE
========================================================= */

function getOptionValue(
    question,
    index
) {

    const option =
        question?.options?.[
            index
        ];


    if (
        option === undefined ||
        option === null
    ) {

        return null;

    }


    if (
        typeof option ===
            "object"
    ) {

        if (
            option.answer !==
                undefined &&
            option.answer !==
                null
        ) {

            return String(
                option.answer
            ).trim();

        }


        if (
            option.value !==
                undefined &&
            option.value !==
                null
        ) {

            return String(
                option.value
            ).trim();

        }


        return String(
            option.label ??
            option.text ??
            ""
        ).trim();

    }


    return String(
        option
    ).trim();

}


/* =========================================================
   NORMALIZE ANSWER KEY
========================================================= */

function normalizeAnswerKey(
    value,
    question
) {

    if (
        value === undefined ||
        value === null
    ) {

        return null;

    }


    const raw =
        String(
            value
        ).trim();


    if (!raw) {

        return null;

    }


    const lowerRaw =
        raw.toLowerCase();


    /* =====================================================
       TRUE / FALSE
    ===================================================== */

    if (
        question?.type ===
        "true_false"
    ) {

        if (
            lowerRaw ===
            "true"
        ) {

            return "true";

        }


        if (
            lowerRaw ===
            "false"
        ) {

            return "false";

        }

    }


    /* =====================================================
       A / B / C / D
    ===================================================== */

    if (
        /^[A-D]$/i.test(
            raw
        )
    ) {

        return raw.toUpperCase();

    }


    /* =====================================================
       NUMERIC INDEX
    ===================================================== */

    if (
        /^\d+$/.test(
            raw
        )
    ) {

        const number =
            Number(raw);


        if (
            Number.isInteger(
                number
            ) &&
            number >= 0 &&
            number <
                (
                    question?.options?.length ??
                    0
                )
        ) {

            if (
                question?.type ===
                "true_false"
            ) {

                return number ===
                    0
                    ? "true"
                    : "false";

            }


            return String.fromCharCode(
                65 + number
            );

        }

    }


    /* =====================================================
       OPTION VALUE / TEXT
    ===================================================== */

    if (
        Array.isArray(
            question?.options
        )
    ) {

        const matchIndex =
            question.options.findIndex(
                option => {

                    if (
                        option === null ||
                        option === undefined
                    ) {

                        return false;

                    }


                    if (
                        typeof option !==
                            "object"
                    ) {

                        return (
                            String(option)
                                .trim()
                                .toLowerCase() ===
                            lowerRaw
                        );

                    }


                    const candidates = [

                        option.label,

                        option.text,

                        option.value,

                        option.answer

                    ]
                        .filter(
                            value =>
                                value !==
                                    undefined &&
                                value !==
                                    null
                        )
                        .map(
                            value =>
                                String(
                                    value
                                )
                                    .trim()
                                    .toLowerCase()
                        );


                    return candidates.includes(
                        lowerRaw
                    );

                }
            );


        if (
            matchIndex !==
            -1
        ) {

            if (
                question?.type ===
                "true_false"
            ) {

                return matchIndex ===
                    0
                    ? "true"
                    : "false";

            }


            return String.fromCharCode(
                65 +
                matchIndex
            );

        }

    }


    return raw;

}


/* =========================================================
   GET CORRECT ANSWER KEYS
========================================================= */

function getCorrectAnswerKeys(
    question
) {

    if (
        Array.isArray(
            question?.correctValues
        ) &&
        question.correctValues.length > 0
    ) {

        return question.correctValues
            .map(
                value =>
                    normalizeAnswerKey(
                        value,
                        question
                    )
            )
            .filter(
                value =>
                    value !== null
            );

    }


    const legacyCandidates = [

        question?.answer,

        question?.correctAnswer,

        question?.correctAnswerValue,

        question?.answerKey

    ];


    for (
        const candidate
        of legacyCandidates
    ) {

        if (
            candidate !== undefined &&
            candidate !== null
        ) {

            const normalized =
                normalizeAnswerKey(
                    candidate,
                    question
                );


            if (
                normalized !== null
            ) {

                return [
                    normalized
                ];

            }

        }

    }


    /*
       Support boolean-style `correct`
       only when it identifies an
       option index/value.
    */

    if (
        question?.correct !==
            undefined &&
        question?.correct !==
            null &&
        typeof question.correct !==
            "boolean"
    ) {

        const normalized =
            normalizeAnswerKey(
                question.correct,
                question
            );


        if (
            normalized !== null
        ) {

            return [
                normalized
            ];

        }

    }


    return [];

}


/* =========================================================
   CHECK ANSWER
========================================================= */

function isCorrectAnswer(
    question,
    selectedIndex
) {

    if (
        selectedIndex === null ||
        selectedIndex === undefined
    ) {

        return false;

    }


    const selectedValue =
        getOptionValue(
            question,
            selectedIndex
        );


    const selectedKey =
        normalizeAnswerKey(
            selectedValue,
            question
        );


    if (
        selectedKey === null
    ) {

        return false;

    }


    const correctKeys =
        getCorrectAnswerKeys(
            question
        );


    return correctKeys.includes(
        selectedKey
    );

}


/* =========================================================
   SAVE COMPLETED QUIZ
========================================================= */

async function saveCompletedQuiz(
    score,
    selectedIndices
) {

    const quizId =
        sessionStorage.getItem(
            "atomikQuizId"
        );


    /*
       Fallback quizzes do not have
       a Supabase history ID.
    */

    if (!quizId) {

        console.warn(
            "No atomikQuizId found. Result will still be displayed."
        );


        return true;

    }


    try {

        const {
            data: {
                user
            }
        } =
            await supabase.auth.getUser();


        if (!user) {

            throw new Error(
                "You are not signed in."
            );

        }


        const {
            error
        } =
            await supabase
                .from("quizzes")
                .update({

                    score:
                        score,

                    user_answers:
                        selectedIndices,

                    completed:
                        true,

                    completed_at:
                        new Date().toISOString()

                })
                .eq(
                    "id",
                    quizId
                )
                .eq(
                    "user_id",
                    user.id
                );


        if (error) {

            throw error;

        }


        console.log(
            "Quiz completion saved:",
            quizId
        );


        return true;

    } catch (error) {

        console.error(
            "Could not save completed quiz:",
            error
        );


        alert(
            "Your quiz was completed, but Atomik could not save the result to History. Please check your connection and try again."
        );


        return false;

    }

}


/* =========================================================
   FINISH QUIZ
========================================================= */

async function finishQuiz() {

    if (
        isFinishing
    ) {

        return;

    }


    isFinishing =
        true;


    /* =====================================================
       LOCK NAVIGATION
    ===================================================== */

    if (previousBtn) {

        previousBtn.disabled =
            true;

    }


    if (nextBtn) {

        nextBtn.disabled =
            true;


        nextBtn.innerHTML =
            `Saving...`;

    }


    try {

        let score =
            0;


        /* =================================================
           SCORE
        ================================================= */

        questions.forEach(
            (
                question,
                index
            ) => {

                const selectedIndex =
                    userAnswers[
                        index
                    ];


                if (
                    selectedIndex ===
                    null
                ) {

                    return;

                }


                if (
                    isCorrectAnswer(
                        question,
                        selectedIndex
                    )
                ) {

                    score++;

                }

            }
        );


        /* =================================================
           ANSWERS
        ================================================= */

        const selectedIndices =
            [
                ...userAnswers
            ];


        const selectedValues =
            questions.map(
                (
                    question,
                    index
                ) => {

                    if (
                        userAnswers[
                            index
                        ] === null
                    ) {

                        return null;

                    }


                    return getOptionValue(
                        question,
                        userAnswers[
                            index
                        ]
                    );

                }
            );


        /* =================================================
           METADATA
        ================================================= */

        let metadata =
            null;


        const savedMetadata =
            sessionStorage.getItem(
                "atomikQuizMetadata"
            );


        if (
            savedMetadata
        ) {

            try {

                metadata =
                    JSON.parse(
                        savedMetadata
                    );

            } catch {

                metadata =
                    null;

            }

        }


        if (
            !metadata ||
            typeof metadata !==
                "object"
        ) {

            metadata = {

                title:
                    quizTitle,

                questionCount:
                    questions.length,

                difficulty:
                    "MEDIUM",

                questionType:
                    "multiple_choice",

                focus:
                    "entire",

                topic:
                    "",

                fileName:
                    ""

            };

        }


        /* =================================================
           SAVE COMPLETED QUIZ
        ================================================= */

        const saved =
            await saveCompletedQuiz(
                score,
                selectedIndices
            );


        if (!saved) {

            return;

        }


        /* =================================================
           RESULTS OBJECT
        ================================================= */

        const results = {

            score:
                score,

            total:
                questions.length,

            questions:
                questions,

            userAnswers:
                selectedIndices,

            selectedIndices:
                selectedIndices,

            selectedValues:
                selectedValues,

            metadata:
                metadata

        };


        const serializedResults =
            JSON.stringify(
                results
            );


        if (
            !serializedResults
        ) {

            throw new Error(
                "Atomik could not prepare your results."
            );

        }


        sessionStorage.setItem(
            "atomikResults",
            serializedResults
        );


        const storedResults =
            sessionStorage.getItem(
                "atomikResults"
            );


        if (!storedResults) {

            throw new Error(
                "Atomik could not prepare your results."
            );

        }


        JSON.parse(
            storedResults
        );


        /* =================================================
           RESULTS PAGE
        ================================================= */

        window.location.href =
            "results.html";


    } catch (error) {

        console.error(
            "Finish quiz error:",
            error
        );


        alert(
            "Atomik couldn't prepare your results. Your quiz has not been lost. Please try finishing again."
        );


        isFinishing =
            false;


        displayQuestion();

    }

}


/* =========================================================
   START QUIZ
========================================================= */

if (
    !quizLoadFailed &&
    questions.length > 0
) {

    displayQuestion();

}