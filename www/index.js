import * as wasm from "wasm-sudokuh";
window.wasm = wasm;

const sudokuh = {
    _main: document.querySelector("main"),
    /**
     * @type {HTMLDivElement | null}
     */
    buttons: null,
    /**
     * @type {HTMLButtonElement | null}
     */
    generate_button: null,
    storage: {
        /**
         * Saves a sudoku as the current generated sudoku. This clears the saved state.
         * @param {{sudoku:Number[][],solution:Number[][]}} data
         */
        save_sudoku: (data) => {
            window.localStorage["sudoku_data"] = JSON.stringify(data);
            window.localStorage["sudoku_state"] = null;
        },
        /**
         * overwrites the current state.
         */
        save_state: () => {
            let state = sudokuh.get_current();
            window.localStorage["sudoku_state"] = JSON.stringify(state);
        },
        /**
         * loads the last state and sudoku if available.
         * @returns {Number[][]}
         */
        load_sudoku: () => {
            let data = window.localStorage["sudoku_data"];
            if (data == null) return;
            /**
             * @type {{sudoku:Number[][],solution:Number[][]}}
             */
            let { sudoku, solution } = JSON.parse(data);

            let state_string = window.localStorage["sudoku_state"];
            /**
             * @type {Number[][] | null}
             */
            let state;
            if (state_string != null) state = JSON.parse(state_string);

            sudokuh.sudoku_ready({ sudoku, solution });

            if (state != null) {
                for (let row in state) {
                    for (let column in state[row]) {
                        let field = sudokuh._main.querySelector(
                            `.field[data-coords="${row}/${column}"]`
                        );
                        if (field == null) continue;

                        field.dataset["field_value"] = state[row][column];
                    }
                }
            }
        },
    },
    init: () => {
        if (sudokuh._main != null) {
            let _main = sudokuh._main;

            let buttons = document.createElement("div");
            buttons.classList.add("buttons");
            _main.appendChild(buttons);
            sudokuh.buttons = buttons;

            let generate_button = document.createElement("button");
            generate_button.innerText = "New Sudo🐮";
            generate_button.classList.add("generate_sudoku");
            generate_button.addEventListener("click", async () => {
                _main.style.setProperty(
                    "--data-img",
                    `url("./${Math.round(Math.random() * 8) + 1}.webp")`
                );
                // instant feedback: generate empty field
                sudokuh.draw_sudoku_field(
                    new Array(9).fill(new Array(9).fill(0)),
                    true
                );

                _main.dataset["solved"] = false;
                generate_button.disabled = true;

                // generate sudoku with little delay to allow rendering
                setTimeout(async () => {
                    let data = await sudokuh.get_sudoku_9by9();
                    sudokuh.storage.save_sudoku(data);
                    sudokuh.sudoku_ready(data);
                }, 50);
            });

            buttons.appendChild(generate_button);
            sudokuh.generate_button = generate_button;

            // prefetch cows
            for (let i = 1; i <= 9; i++) {
                (async () => {
                    let img = document.createElement("img");
                    img.src = `./${i}.webp`;
                    img.hidden = true;
                    document.body.appendChild(img);
                    img.addEventListener("load", () => {
                        img.outerHTML = "";
                    });
                })();
            }

            _main.dataset["state"] = "ready";

            // load last sudoku (if available)
            sudokuh.storage.load_sudoku();
        }
    },

    /**
     *
     * @param {{sudoku:Number[][],solution:Number[][]}} data
     * @param {HTMLButtonElement} generate_button
     * @param {HTMLDivElement} _buttons
     */
    sudoku_ready: (data) => {
        let _main = sudokuh._main;

        // draw the sudoku
        sudokuh.draw_sudoku_field(data.sudoku, false);
        sudokuh.generate_button.disabled = false;

        // add verify button
        let verify_button = document.createElement("button");
        verify_button.innerText = "Verify";
        verify_button.classList.add("verify");
        verify_button.addEventListener("click", () => {
            let current = sudokuh.get_current();
            let solution = data.solution;
            let correct = current.every((row, row_index) =>
                row.every(
                    (field, column_index) =>
                        solution[row_index][column_index] == field
                )
            );
            if (correct) {
                _main.dataset["solved"] = true;
                remove_buttons();
                sudokuh.generate_button.removeEventListener(
                    "click",
                    remove_buttons
                );
                window.localStorage["last_sudoku"] = null;
            } else {
                _main.classList.add("feedback-incorrect");
                setTimeout(() => {
                    _main.classList.remove("feedback-incorrect");
                }, 250);
            }
        });
        sudokuh.buttons.appendChild(verify_button);

        // hints
        let add_hint = (evt) => {
            if ((evt.type == "keypress" && evt.key == "h") || evt.type == "click") {
                /** @type {{row:Number, column: Number, value: Number}[]} */
                let hint_candidates = new Array();

                let current = sudokuh.get_current();
                let solution = data.solution;

                for (let row_index in current) {
                    for (let column_index in current[row_index]) {
                        if (
                            current[row_index][column_index] !=
                            solution[row_index][column_index]
                        ) {
                            hint_candidates.push({
                                row: Number(row_index),
                                column: Number(column_index),
                                value: solution[row_index][column_index],
                            });
                        }
                    }
                }

                if (hint_candidates.length == 0) return;

                let hint =
                    hint_candidates[
                        Math.floor(Math.random() * (hint_candidates.length - 1))
                    ];

                let field = _main.querySelector(
                    `.field[data-coords="${hint.row}/${hint.column}"`
                );

                field.dataset["field_value"] = hint.value;
                field.dataset["constant"] = true;

                data.sudoku[hint.row][hint.column] = hint.value;
                sudokuh.storage.save_sudoku(data);
                sudokuh.storage.save_state();
            }
        };
        let hint_button = document.createElement("button");
        hint_button.innerText = "h";
        hint_button.title = "Show a hint";
        hint_button.classList.add("hint");
        hint_button.addEventListener("click", add_hint);
        sudokuh.buttons.appendChild(hint_button);
        // shortcut: h
        document.addEventListener("keypress", add_hint);
        sudokuh.generate_button.addEventListener("click", () => {
            document.removeEventListener("keypress", add_hint);
        });
        // callback to remove buttons
        let remove_buttons = () => {
            verify_button.outerHTML = "";
            hint_button.outerHTML = "";
        };
        sudokuh.generate_button.addEventListener("click", remove_buttons, {
            once: true,
        });
    },

    /**
     * gets the current state, this can be compared to the solution to figure wether it is correct.
     * @returns {Number[][]}
     */
    get_current: () => {
        let _main = sudokuh._main;
        return Array.from(_main.querySelectorAll(".field"))
            .map((field) => Number(field.dataset["field_value"]))
            .reduce((acc, curr, index) => {
                if (index % 9 == 0) {
                    acc.push(new Array(9));
                }

                acc[(index - (index % 9)) / 9][index % 9] = curr;
                return acc;
            }, []);
    },

    /**
     * @param data {{sudoku:Number[][]}}
     * @param empty_field {boolean}
     */
    draw_sudoku_field: (data, empty_field) => {
        let class_name = "sudoku_grid";
        let _main = sudokuh._main;
        let grid = _main.querySelector(`.${class_name}`);
        if (grid != null) {
            grid.innerHTML = "";
        } else {
            grid = document.createElement("div");
            grid.classList.add(class_name);
            _main.insertBefore(grid, _main.firstElementChild);
        }
        if (empty_field) {
            grid.classList.add("empty");
        } else {
            grid.classList.remove("empty");
        }

        let gap = document.createElement("div");
        gap.classList.add("gap");

        for (let row in data) {
            if (row % 3 == 0 && row != 0) {
                for (let i = 0; i < 9 + 2; i++) {
                    grid.appendChild(gap.cloneNode());
                }
            }
            for (let field_index in data[row]) {
                if (field_index % 3 == 0 && field_index != 0) {
                    grid.appendChild(gap.cloneNode());
                }

                let field_value = data[row][field_index];
                let field = document.createElement("div");
                field.classList.add("field");
                field.dataset["field_value"] = field_value;
                field.dataset["constant"] = field_value != 0;
                field.dataset["coords"] = `${row}/${field_index}`;
                if (field_value == 0) {
                    field.addEventListener("click", () => {
                        if (_main.dataset["solved"] != "true") {
                            field.dataset["field_value"] =
                                (Number(field.dataset["field_value"]) + 1) % 10;
                            sudokuh.storage.save_state();
                        }
                    });
                }

                grid.appendChild(field);
            }
        }
    },
    /**
     * @return {Promise<{sudoku:Number[][],solution:Number[][]}>}
     */
    get_sudoku_9by9: async () => {
        let [sudoku, solution] = JSON.parse(await wasm["get_sudoku_9by9"]());
        return { sudoku, solution };
    },
};

window.sudokuh = sudokuh;

window.sudokuh.init();
