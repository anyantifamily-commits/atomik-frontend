/* =========================================================
   ATOMIK CGPA CALCULATOR
   ========================================================= */


/* =========================================================
   ADD COURSE
   ========================================================= */

function addCourse() {

    const courseList =
        document.getElementById("courseList");


    const row =
        document.createElement("div");


    row.className =
        "course-row";


    row.innerHTML = `

        <input
            type="text"
            class="course-code"
            placeholder="CHM 101"
        >

        <input
            type="number"
            class="credit-unit"
            placeholder="3"
            min="1"
            max="20"
        >

        <select class="grade">

            <option value="">
                Grade
            </option>

            <option value="5">
                A
            </option>

            <option value="4">
                B
            </option>

            <option value="3">
                C
            </option>

            <option value="2">
                D
            </option>

            <option value="1">
                E
            </option>

            <option value="0">
                F
            </option>

        </select>

        <button
            type="button"
            class="remove-course"
            onclick="removeCourse(this)"
        >
            ×
        </button>

    `;


    courseList.appendChild(row);

}


/* =========================================================
   REMOVE COURSE
   ========================================================= */

function removeCourse(button) {

    const row =
        button.closest(".course-row");


    if (!row) {
        return;
    }


    const courseList =
        document.getElementById("courseList");


    /*
        Keep at least one course row.
    */

    if (
        courseList.children.length <= 1
    ) {

        alert(
            "You need at least one course."
        );

        return;

    }


    row.remove();

}


/* =========================================================
   CALCULATE GPA
   ========================================================= */

function calculateGPA() {

    const rows =
        document.querySelectorAll(
            ".course-row"
        );


    let totalUnits = 0;

    let totalPoints = 0;

    let incomplete = false;


    rows.forEach(
        function (row) {

            const unitInput =
                row.querySelector(
                    ".credit-unit"
                );


            const gradeInput =
                row.querySelector(
                    ".grade"
                );


            const units =
                Number(
                    unitInput.value
                );


            const grade =
                gradeInput.value;


            /*
                Ignore completely empty rows.
            */

            if (
                !units &&
                !grade
            ) {

                return;

            }


            /*
                Check missing information.
            */

            if (
                !units ||
                grade === ""
            ) {

                incomplete = true;

                return;

            }


            /*
                Validate units.
            */

            if (
                units < 1 ||
                units > 20
            ) {

                incomplete = true;

                return;

            }


            const gradePoint =
                Number(grade);


            totalUnits += units;

            totalPoints +=
                units * gradePoint;

        }
    );


    if (incomplete) {

        alert(
            "Please complete the credit unit and grade for every course."
        );

        return;

    }


    if (totalUnits === 0) {

        alert(
            "Please enter at least one course."
        );

        return;

    }


    /*
        Calculate GPA.
    */

    const gpa =
        totalPoints / totalUnits;


    const roundedGPA =
        gpa.toFixed(2);


    /*
        Display result.
    */

    document.getElementById(
        "gpaValue"
    ).textContent =
        roundedGPA;


    document.getElementById(
        "totalUnits"
    ).textContent =
        totalUnits;


    document.getElementById(
        "totalPoints"
    ).textContent =
        totalPoints.toFixed(1);


    document.getElementById(
        "classification"
    ).textContent =
        getClassification(gpa);


    document.getElementById(
        "resultCard"
    ).classList.remove(
        "hidden"
    );


    /*
        Scroll to result.
    */

    document
        .getElementById("resultCard")
        .scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

}


/* =========================================================
   CLASSIFICATION
   ========================================================= */

function getClassification(gpa) {

    /*
        Nigerian-style 5-point scale.

        4.50 - 5.00 = First Class
        3.50 - 4.49 = Second Class Upper
        2.40 - 3.49 = Second Class Lower
        1.50 - 2.39 = Third Class
        1.00 - 1.49 = Pass
        Below 1.00  = Fail
    */


    if (gpa >= 4.50) {

        return "First Class";

    }


    if (gpa >= 3.50) {

        return "Second Class Upper";

    }


    if (gpa >= 2.40) {

        return "Second Class Lower";

    }


    if (gpa >= 1.50) {

        return "Third Class";

    }


    if (gpa >= 1.00) {

        return "Pass";

    }


    return "Fail";

}


/* =========================================================
   RESET
   ========================================================= */

function resetCalculator() {

    const courseList =
        document.getElementById(
            "courseList"
        );


    /*
        Return to one empty course.
    */

    courseList.innerHTML = `

        <div class="course-row">

            <input
                type="text"
                class="course-code"
                placeholder="BIO 101"
            >

            <input
                type="number"
                class="credit-unit"
                placeholder="3"
                min="1"
                max="20"
            >

            <select class="grade">

                <option value="">
                    Grade
                </option>

                <option value="5">
                    A
                </option>

                <option value="4">
                    B
                </option>

                <option value="3">
                    C
                </option>

                <option value="2">
                    D
                </option>

                <option value="1">
                    E
                </option>

                <option value="0">
                    F
                </option>

            </select>

            <button
                type="button"
                class="remove-course"
                onclick="removeCourse(this)"
            >
                ×
            </button>

        </div>

    `;


    /*
        Hide result.
    */

    document
        .getElementById("resultCard")
        .classList.add(
            "hidden"
        );

}