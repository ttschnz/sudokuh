mod utils;

use sudoku_variants::{
    constraint::DefaultConstraint,
    error::SudokuError,
    generator::{Generator, Reducer},
    SudokuGrid,
};

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub async fn greet() -> String {
    return String::from("hello world");
    // alert("Hello, sudokuh :)");
}

#[wasm_bindgen]
pub async fn get_sudoku_9by9() -> JsValue {
    JsValue::from_str(
        &serde_json::to_string(&generate_sudoku().unwrap().map(|item| {
            item.cells()
                .into_iter()
                .map(|el| el.unwrap_or(0) as i8)
                .collect::<Vec<_>>()
                .chunks_exact(9)
                .map(|chunk| chunk.to_vec())
                .collect::<Vec<_>>()
        }))
        .unwrap_or("serde error".to_string()),
    )
}

fn generate_sudoku() -> Result<[SudokuGrid; 2], SudokuError> {
    let mut sudoku = Generator::new_default().generate(3, 3, DefaultConstraint)?;
    let solution = sudoku.clone();
    Reducer::new_default().reduce(&mut sudoku);
    Ok([sudoku.grid().clone(), solution.grid().clone()])
}
