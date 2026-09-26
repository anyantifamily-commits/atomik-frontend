import { supabase } from "./supabase.js";


/* =========================================================
   ATOMIK RESULTS ENGINE
========================================================= */

let resultsLoadFailed = false;


/* =========================================================
   LOAD RESULTS
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        loadResults();
    }
);


async function loadResults() {

    const resultsData =
        sessionStorage.getItem(
            "atomikResults"
        );

    const quizData =
        sessionStorage.getItem(
            "atomikQuiz"
        );

    const metadataData =
        sessionStorage.getItem(
            "atomikQuizMetadata"
        );


    /*
       Results require both the completed
       result object and the original quiz.
    */

    if (
        !resultsData ||
        !quizData
    ) {

        showEmptyResults();

        return;

    }


    try {

        const results =
            JSON.parse(
                resultsData
            );


        const quiz =
            JSON.parse(
                quizData
            );


        /*
           Validate the main objects independently.
        */

        if (
            !results ||
            typeof results !== "object"
        ) {

            throw new Error(
                "Invalid results data."
            );

        }


        if (
            !quiz
        ) {

            throw new Error(
                "Invalid quiz data."
            );

        }


        let metadata = {};


        /*
           Metadata is useful, but it should
           never prevent a valid Results page
           from loading.
        */

        if (metadataData) {

            try {

                const parsedMetadata =
                    JSON.parse(
                        metadataData
                    );


                if (
                    parsedMetadata &&
                    typeof parsedMetadata ===
                        "object"
                ) {

                    metadata =
                        parsedMetadata;

                }

            } catch (error) {

                console.warn(
                    "Metadata could not be parsed. Using defaults.",
                    error
                );

            }

        }


        /* =========================================
           GET QUESTIONS
        ========================================= */

        const questions =
            Array.isArray(quiz)
                ? quiz
                : Array.isArray(
                    quiz?.questions
                )
                    ? quiz.questions
                    : [];


        if (
            questions.length === 0
        ) {

            throw new Error(
                "No quiz questions were found."
            );

        }


        /* =========================================
           GET USER ANSWERS
        ========================================= */

        let userAnswers =
            results.selectedIndices ??
            results.userAnswers ??
            results.answers ??
            [];


        if (
            !Array.isArray(
                userAnswers
            )
        ) {

            userAnswers = [];

        }


        /*
           Keep the answer array aligned
           with the actual quiz.
        */

        if (
            userAnswers.length >
            questions.length
        ) {

            userAnswers =
                userAnswers.slice(
                    0,
                    questions.length
                );

        }


        while (
            userAnswers.length <
            questions.length
        ) {

            userAnswers.push(
                null
            );

        }


        /* =========================================
           GET STORED SCORE
        ========================================= */

        let storedScore =
            Number(
                results.score ??
                results.correct
            );


        if (
            !Number.isFinite(
                storedScore
            )
        ) {

            storedScore =
                null;

        }


        if (
            storedScore !== null
        ) {

            storedScore =
                Math.floor(
                    storedScore
                );

        }


        /* =========================================
           TOTAL
        ========================================= */

        /*
           The actual quiz question count is
           authoritative.

           This prevents a corrupted result
           object from saying, for example:

           8 questions
           Score: 7/20
        */

        const total =
            questions.length;


        if (
            total <= 0
        ) {

            throw new Error(
                "The quiz has no questions."
            );

        }


        /* =========================================
           RECOMPUTE SCORE
        ========================================= */

        const calculatedScore =
            calculateScore(
                questions,
                userAnswers
            );


        /*
           If the stored score is valid AND
           matches the answers, keep it.

           If it does not match, use the
           independently calculated score.

           This prevents Results from showing
           a misleading score if sessionStorage
           was modified or corrupted.
        */

        let score =
            calculatedScore;


        if (
            storedScore !== null &&
            storedScore >= 0 &&
            storedScore <= total &&
            storedScore === calculatedScore
        ) {

            score =
                storedScore;

        }


        /* =========================================
           DISPLAY
        ========================================= */

        displayScore(
            score,
            total
        );


        displayPerformance(
            score,
            total
        );


        displayCounts(
            score,
            total
        );


        displayMetadata(
            quiz,
            metadata,
            total
        );


        displayQuestionReview(
            questions,
            userAnswers
        );


    } catch (error) {

        console.error(
            "Results loading error:",
            error
        );


        resultsLoadFailed =
            true;


        showEmptyResults();

    }

}


/* =========================================================
   CALCULATE SCORE
========================================================= */

function calculateScore(
    questions,
    userAnswers
) {

    let score = 0;


    questions.forEach(
        (
            question,
            index
        ) => {

            const selectedIndex =
                userAnswers[index];


            if (
                !Number.isInteger(
                    selectedIndex
                )
            ) {

                return;

            }


            if (
                selectedIndex < 0 ||
                selectedIndex >=
                    (
                        question?.options
                            ?.length ??
                        0
                    )
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


    return score;

}


/* =========================================================
   EMPTY RESULTS
========================================================= */

function showEmptyResults() {

    const reviewList =
        document.getElementById(
            "questionReviewList"
        );


    if (!reviewList) return;


    reviewList.innerHTML =
        "";


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "empty-results";


    const message =
        document.createElement(
            "p"
        );


    message.textContent =
        "No valid quiz results were found.";


    const button =
        document.createElement(
            "button"
        );


    button.type =
        "button";


    button.textContent =
        "Back to Atomik";


    button.addEventListener(
        "click",
        () => {

            window.location.href =
                "index.html";

        }
    );


    wrapper.appendChild(
        message
    );


    wrapper.appendChild(
        button
    );


    reviewList.appendChild(
        wrapper
    );

}


/* =========================================================
   NORMALIZE VALUE
========================================================= */

function normalizeValue(
    value
) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }


    return String(
        value
    )
        .trim()
        .toLowerCase();

}


/* =========================================================
   GET OPTION LABEL
========================================================= */

function getOptionLabel(
    option,
    index
) {

    if (
        option === undefined ||
        option === null
    ) {

        return "";

    }


    if (
        typeof option === "object"
    ) {

        return String(
            option.label ??
            option.text ??
            option.value ??
            ""
        ).trim();

    }


    return String(
        option
    ).trim();

}


/* =========================================================
   GET OPTION KEY
========================================================= */

function getOptionKey(
    option,
    index
) {

    if (
        option &&
        typeof option === "object"
    ) {

        if (
            option.answer !== undefined &&
            option.answer !== null &&
            String(
                option.answer
            ).trim() !== ""
        ) {

            return String(
                option.answer
            ).trim();

        }


        if (
            option.value !== undefined &&
            option.value !== null &&
            String(
                option.value
            ).trim() !== ""
        ) {

            return String(
                option.value
            ).trim();

        }

    }


    return String.fromCharCode(
        65 + index
    );

}


/* =========================================================
   RESOLVE ANSWER TO OPTION INDEX
========================================================= */

function resolveAnswerIndex(
    question,
    answer
) {

    if (
        answer === undefined ||
        answer === null
    ) {

        return -1;

    }


    const options =
        Array.isArray(
            question?.options
        )
            ? question.options
            : [];


    if (
        options.length === 0
    ) {

        return -1;

    }


    const raw =
        String(
            answer
        ).trim();


    if (!raw) {

        return -1;

    }


    /* =========================================
       A/B/C/D
    ========================================= */

    if (
        /^[A-D]$/i.test(raw)
    ) {

        const index =
            raw
                .toUpperCase()
                .charCodeAt(0) -
            65;


        if (
            index >= 0 &&
            index < options.length
        ) {

            return index;

        }

    }


    /* =========================================
       NUMERIC INDEX
    ========================================= */

    if (
        /^\d+$/.test(raw)
    ) {

        const number =
            Number(raw);


        /*
           Atomik's current userAnswers use
           zero-based indexes.

           Therefore zero-based interpretation
           comes first.
        */

        if (
            Number.isInteger(number) &&
            number >= 0 &&
            number < options.length
        ) {

            return number;

        }


        /*
           Legacy one-based support.
        */

        if (
            Number.isInteger(number) &&
            number >= 1 &&
            number <= options.length
        ) {

            return number - 1;

        }

    }


    /* =========================================
       MATCH OPTION KEY
    ========================================= */

    const normalizedRaw =
        normalizeValue(
            raw
        );


    const keyIndex =
        options.findIndex(
            (
                option,
                index
            ) => {

                return (
                    normalizeValue(
                        getOptionKey(
                            option,
                            index
                        )
                    ) ===
                    normalizedRaw
                );

            }
        );


    if (
        keyIndex !== -1
    ) {

        return keyIndex;

    }


    /* =========================================
       MATCH OPTION TEXT
    ========================================= */

    const textIndex =
        options.findIndex(
            (
                option,
                index
            ) => {

                return (
                    normalizeValue(
                        getOptionLabel(
                            option,
                            index
                        )
                    ) ===
                    normalizedRaw
                );

            }
        );


    if (
        textIndex !== -1
    ) {

        return textIndex;

    }


    return -1;

}


/* =========================================================
   GET CORRECT OPTION INDEX
========================================================= */

function getCorrectOptionIndex(
    question
) {

    const options =
        Array.isArray(
            question?.options
        )
            ? question.options
            : [];


    if (
        options.length === 0
    ) {

        return -1;

    }


    /* =========================================
       CORRECT VALUES
    ========================================= */

    if (
        Array.isArray(
            question?.correctValues
        ) &&
        question.correctValues.length > 0
    ) {

        for (
            const correctValue
            of question.correctValues
        ) {

            const index =
                resolveAnswerIndex(
                    question,
                    correctValue
                );


            if (
                index !== -1
            ) {

                return index;

            }

        }

    }


    /* =========================================
       QUESTION-LEVEL ANSWER
    ========================================= */

    if (
        question?.answer !== undefined &&
        question?.answer !== null
    ) {

        const index =
            resolveAnswerIndex(
                question,
                question.answer
            );


        if (
            index !== -1
        ) {

            return index;

        }

    }


    /* =========================================
       OTHER LEGACY FIELDS
    ========================================= */

    const possibleFields = [

        question?.correctAnswer,

        question?.correctAnswerValue,

        question?.correct,

        question?.answerKey

    ];


    for (
        const possibleAnswer
        of possibleFields
    ) {

        if (
            possibleAnswer === undefined ||
            possibleAnswer === null
        ) {

            continue;

        }


        /*
           A boolean `correct` does not identify
           an option by itself.
        */

        if (
            typeof possibleAnswer ===
                "boolean"
        ) {

            continue;

        }


        const index =
            resolveAnswerIndex(
                question,
                possibleAnswer
            );


        if (
            index !== -1
        ) {

            return index;

        }

    }


    return -1;

}


/* =========================================================
   CHECK WHETHER ANSWER IS CORRECT
========================================================= */

function isCorrectAnswer(
    question,
    selectedIndex
) {

    if (
        !Number.isInteger(
            selectedIndex
        )
    ) {

        return false;

    }


    if (
        selectedIndex < 0 ||
        selectedIndex >=
            (
                question?.options
                    ?.length ??
                0
            )
    ) {

        return false;

    }


    const correctIndex =
        getCorrectOptionIndex(
            question
        );


    if (
        correctIndex !== -1
    ) {

        return (
            selectedIndex ===
            correctIndex
        );

    }


    /*
       Last-resort compatibility check.
    */

    if (
        Array.isArray(
            question?.correctValues
        )
    ) {

        const selectedOption =
            question.options[
                selectedIndex
            ];


        if (
            selectedOption
        ) {

            const selectedKey =
                getOptionKey(
                    selectedOption,
                    selectedIndex
                );


            return question.correctValues.some(
                correctValue =>
                    normalizeValue(
                        correctValue
                    ) ===
                    normalizeValue(
                        selectedKey
                    )
            );

        }

    }


    return false;

}


/* =========================================================
   DISPLAY SCORE
========================================================= */

function displayScore(
    score,
    total
) {

    const percentage =
        total > 0
            ? Math.round(
                (
                    score /
                    total
                ) * 100
            )
            : 0;


    const scoreElement =
        document.getElementById(
            "score"
        );


    const totalElement =
        document.getElementById(
            "total"
        );


    const percentageElement =
        document.getElementById(
            "scorePercentage"
        );


    const circle =
        document.getElementById(
            "scoreCircle"
        );


    if (
        scoreElement
    ) {

        scoreElement.textContent =
            String(score);

    }


    if (
        totalElement
    ) {

        totalElement.textContent =
            String(total);

    }


    if (
        percentageElement
    ) {

        percentageElement.textContent =
            `${percentage}%`;

    }


    if (
        circle
    ) {

        circle.style.setProperty(
            "--score",
            `${percentage}%`
        );


        circle.style.setProperty(
            "--percentage",
            `${percentage}%`
        );


        circle.style.setProperty(
            "--progress",
            `${percentage}%`
        );


        circle.style.setProperty(
            "--score-percent",
            percentage
        );


        circle.style.setProperty(
            "--score-value",
            percentage
        );


        circle.style.background =
            `conic-gradient(
                #e50914 ${percentage}%,
                #eeeeee ${percentage}% 100%
            )`;

    }

}


/* =========================================================
   PERFORMANCE MESSAGE
========================================================= */

function displayPerformance(
    score,
    total
) {

    const element =
        document.getElementById(
            "performanceMessage"
        );


    if (!element) return;


    const percentage =
        total > 0
            ? (
                score /
                total
            ) * 100
            : 0;


    if (
        percentage >= 80
    ) {

        element.textContent =
            "Excellent work! You really know your stuff.";

    }

    else if (
        percentage >= 60
    ) {

        element.textContent =
            "Good work! A little more revision will strengthen your understanding.";

    }

    else if (
        percentage >= 40
    ) {

        element.textContent =
            "You're getting there. Review the explanations and try again.";

    }

    else {

        element.textContent =
            "Keep studying. Use the explanations below to strengthen your understanding.";

    }

}


/* =========================================================
   STATISTICS
========================================================= */

function displayCounts(
    score,
    total
) {

    const correct =
        document.getElementById(
            "correctCount"
        );


    const wrong =
        document.getElementById(
            "wrongCount"
        );


    const totalElement =
        document.getElementById(
            "totalCount"
        );


    if (
        correct
    ) {

        correct.textContent =
            String(score);

    }


    if (
        wrong
    ) {

        wrong.textContent =
            String(
                Math.max(
                    total - score,
                    0
                )
            );

    }


    if (
        totalElement
    ) {

        totalElement.textContent =
            String(total);

    }

}


/* =========================================================
   METADATA
========================================================= */

function displayMetadata(
    quiz,
    metadata,
    total
) {

    const title =
        document.getElementById(
            "metadataTitle"
        );


    const focus =
        document.getElementById(
            "metadataFocus"
        );


    const difficulty =
        document.getElementById(
            "metadataDifficulty"
        );


    const questionsElement =
        document.getElementById(
            "metadataQuestions"
        );


    const topic =
        document.getElementById(
            "metadataTopic"
        );


    const file =
        document.getElementById(
            "metadataFile"
        );


    const quizTitle =
        quiz?.title ||
        metadata?.title ||
        metadata?.fileName ||
        "Atomik Quiz";


    if (
        title
    ) {

        title.textContent =
            quizTitle;

    }


    if (
        focus
    ) {

        focus.textContent =
            metadata?.focus ===
                "topic"
                ? "Specific Topic"
                : "Entire Material";

    }


    if (
        difficulty
    ) {

        difficulty.textContent =
            String(
                metadata?.difficulty ||
                "Medium"
            ).toUpperCase();

    }


    if (
        questionsElement
    ) {

        questionsElement.textContent =
            `${total} ${
                total === 1
                    ? "question"
                    : "questions"
            }`;

    }


    if (
        topic
    ) {

        if (
            metadata?.topic &&
            String(
                metadata.topic
            ).trim() !== ""
        ) {

            topic.textContent =
                metadata.topic;

            topic.style.display =
                "block";

        }

        else {

            topic.textContent =
                "";

            topic.style.display =
                "none";

        }

    }


    if (
        file
    ) {

        file.textContent =
            metadata?.fileName ||
            "Study material";

    }

}


/* =========================================================
   QUESTION REVIEW
========================================================= */

function displayQuestionReview(
    questions,
    userAnswers
) {

    const reviewList =
        document.getElementById(
            "questionReviewList"
        );


    if (!reviewList) return;


    reviewList.innerHTML =
        "";


    if (
        !Array.isArray(questions) ||
        questions.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "empty-results";


        const message =
            document.createElement(
                "p"
            );


        message.textContent =
            "No questions were found for this quiz.";


        empty.appendChild(
            message
        );


        reviewList.appendChild(
            empty
        );


        return;

    }


    questions.forEach(
        (
            question,
            questionIndex
        ) => {

            /* =========================================
               SELECTED INDEX
            ========================================= */

            const rawSelected =
                userAnswers[
                    questionIndex
                ];


            const selectedIndex =
                Number.isInteger(
                    rawSelected
                )
                    ? rawSelected
                    : null;


            /* =========================================
               OPTIONS
            ========================================= */

            const options =
                Array.isArray(
                    question?.options
                )
                    ? question.options
                    : [];


            /* =========================================
               CORRECT INDEX
            ========================================= */

            const correctIndex =
                getCorrectOptionIndex(
                    question
                );


            /* =========================================
               SELECTED OPTION
            ========================================= */

            const selectedOption =
                selectedIndex !== null &&
                selectedIndex >= 0 &&
                selectedIndex < options.length
                    ? options[
                        selectedIndex
                    ]
                    : null;


            /* =========================================
               CORRECT OPTION
            ========================================= */

            const correctOption =
                correctIndex !== -1 &&
                correctIndex < options.length
                    ? options[
                        correctIndex
                    ]
                    : null;


            /* =========================================
               CORRECTNESS
            ========================================= */

            const isCorrect =
                isCorrectAnswer(
                    question,
                    selectedIndex
                );


            /* =========================================
               CARD
            ========================================= */

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                `question-review ${
                    isCorrect
                        ? "correct"
                        : "incorrect"
                }`;


            /* =========================================
               QUESTION NUMBER
            ========================================= */

            const questionNumber =
                document.createElement(
                    "div"
                );


            questionNumber.className =
                "question-number";


            questionNumber.textContent =
                `Question ${
                    questionIndex + 1
                }`;


            /* =========================================
               QUESTION TEXT
            ========================================= */

            const questionText =
                document.createElement(
                    "div"
                );


            questionText.className =
                "question-text";


            questionText.textContent =
                question?.question ||
                "Question unavailable.";


            /* =========================================
               YOUR ANSWER
            ========================================= */

            const yourAnswer =
                document.createElement(
                    "div"
                );


            yourAnswer.className =
                "answer-box your-answer";


            if (
                selectedOption
            ) {

                if (
                    isCorrect
                ) {

                    yourAnswer.classList.add(
                        "correct-answer"
                    );

                }

                else {

                    yourAnswer.classList.add(
                        "wrong-answer"
                    );

                }

            }


            const yourLabel =
                document.createElement(
                    "div"
                );


            yourLabel.className =
                "answer-box-label";


            yourLabel.textContent =
                "YOUR ANSWER";


            const yourValue =
                document.createElement(
                    "div"
                );


            yourValue.className =
                "answer-box-text";


            yourValue.textContent =
                selectedOption
                    ? getOptionLabel(
                        selectedOption,
                        selectedIndex
                    )
                    : "Not answered";


            yourAnswer.appendChild(
                yourLabel
            );


            yourAnswer.appendChild(
                yourValue
            );


            /* =========================================
               CORRECT ANSWER
            ========================================= */

            const correctAnswer =
                document.createElement(
                    "div"
                );


            correctAnswer.className =
                "answer-box correct-answer-box";


            const correctLabel =
                document.createElement(
                    "div"
                );


            correctLabel.className =
                "answer-box-label";


            correctLabel.textContent =
                "CORRECT ANSWER";


            const correctValue =
                document.createElement(
                    "div"
                );


            correctValue.className =
                "answer-box-text";


            correctValue.textContent =
                correctOption
                    ? getOptionLabel(
                        correctOption,
                        correctIndex
                    )
                    : "Unavailable";


            correctAnswer.appendChild(
                correctLabel
            );


            correctAnswer.appendChild(
                correctValue
            );


            /* =========================================
               EXPLANATION
            ========================================= */

            const explanation =
                document.createElement(
                    "div"
                );


            explanation.className =
                "explanation";


            const explanationLabel =
                document.createElement(
                    "div"
                );


            explanationLabel.className =
                "explanation-label";


            explanationLabel.textContent =
                "EXPLANATION";


            const explanationText =
                document.createElement(
                    "div"
                );


            explanationText.className =
                "explanation-text";


            explanationText.textContent =
                question?.explanation ||
                question?.feedback ||
                "No explanation was provided for this question.";


            explanation.appendChild(
                explanationLabel
            );


            explanation.appendChild(
                explanationText
            );


            /* =========================================
               ASSEMBLE CARD
            ========================================= */

            card.appendChild(
                questionNumber
            );


            card.appendChild(
                questionText
            );


            card.appendChild(
                yourAnswer
            );


            card.appendChild(
                correctAnswer
            );


            card.appendChild(
                explanation
            );


            reviewList.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   HISTORY BACK FUNCTION
========================================================= */

window.goBackToHistory =
    function () {

        window.location.href =
            "history.html";

    };