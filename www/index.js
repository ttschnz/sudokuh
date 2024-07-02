import * as wasm from "wasm-sudokuh";
window.wasm = wasm;

const sudokuh = {
    _main: document.querySelector("main"),
    init: () => {
        if (sudokuh._main != null) {
            let _main = sudokuh._main;

            let _buttons = document.createElement("div");
            _buttons.classList.add("buttons");
            _main.appendChild(_buttons);

            let generate_button = document.createElement("button");
            generate_button.innerText = "New Sudo🐮";
            generate_button.classList.add("generate_sudoku");
            generate_button.addEventListener("click", async () => {
                _main.style.setProperty("--data-img", `url("${Math.round(Math.random()*8)+1}.png")`);
                // instant feedback: generate empty field
                sudokuh.draw_sudoku_field(
                    new Array(9).fill(new Array(9).fill(0)), true
                );
                
                _main.dataset["solved"] = false;
                generate_button.disabled = true;

                // generate sudoku with little delay to allow rendering
                setTimeout(async () => {
                    let data = await sudokuh.get_sudoku_9by9();
                    window.localStorage["last_sudoku"] = JSON.stringify(data);
                    sudokuh.sudoku_ready(data, generate_button, _buttons);
                }, 50);
            });

            _buttons.appendChild(generate_button);

            // prefetch cows
            for (let i = 1; i <= 9; i++) {
                (async () => {
                    let img = document.createElement("img");
                    img.src = `/${i}.png`;
                    img.hidden = true;
                    document.body.appendChild(img);
                    img.addEventListener("load", () => {
                        img.outerHTML = "";
                    });
                })();
            }

            _main.dataset["state"] = "ready";

            // check if there is a sudoku saved
            if (window.localStorage["last_sudoku"] != null) {
                let data = JSON.parse(window.localStorage["last_sudoku"]);
                sudokuh.sudoku_ready(data, generate_button, _buttons);
            }
        }
    },

    /**
     *
     * @param {{sudoku:Number[][],solution:Number[][]}} data
     * @param {HTMLButtonElement} generate_button
     * @param {HTMLDivElement} _buttons
     */
    sudoku_ready: (data, generate_button, _buttons) => {
        // callback to remove verify when generating a new one
        let remove_verify = () => {
            verify_button.outerHTML = "";
        };

        // draw the sudoku
        sudokuh.draw_sudoku_field(data.sudoku, false);
        generate_button.disabled = false;

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
                remove_verify();
                generate_button.removeEventListener("click", remove_verify);
                window.localStorage["last_sudoku"] = null;
            }
        });
        _buttons.appendChild(verify_button);
        generate_button.addEventListener("click", remove_verify, {
            once: true,
        });

        // hints
        let add_hint = (evt) => {
            if (evt.key == "h") {
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
                let field =
                    _main.querySelectorAll(".field")[
                        hint.row * 9 + hint.column
                    ];

                field.dataset["field_value"] = hint.value;
                field.dataset["constant"] = true;
            }
        };
        document.addEventListener("keypress", add_hint);
        generate_button.addEventListener("click", () => {
            document.removeEventListener("keypress", add_hint);
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
        if(empty_field){
            grid.classList.add("empty");
        }else{
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
