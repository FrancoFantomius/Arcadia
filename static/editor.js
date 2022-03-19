const boldBtn = document.querySelector("#bold-btn")
const underlineBtn = document.querySelector("#underline-btn")
const italicBtn = document.querySelector("#italic-btn")
const colorBtn = document.querySelector("#color-btn")

const newBtn = document.querySelector("#new-btn")
const txtBtn = document.querySelector("#txt-btn")
const save = document.querySelector("#upload")

const content = document.querySelector("#content")
const filename = document.querySelector("#filename-input")

boldBtn.addEventListener("click", () => {
    document.execCommand("bold")
})

underlineBtn.addEventListener("click", () => {
    document.execCommand("underline")
})

italicBtn.addEventListener("click", () => {
    document.execCommand("italic")
})

colorBtn.addEventListener("input", () => {
    document.execCommand("forecolor", false, colorBtn.value)
})

newBtn.addEventListener("click", () => {
    content.innerHTML = ""
})

txtBtn.addEventListener("click", () => {
    const a = document.createElement("a")
    const blob = new Blob([content.innerText])
    const dataUrl = URL.createObjectURL(blob)
    a.href = dataUrl
    a.download = filename.value + ".txt"
    a.click()
})

save.addEventListener("click",() => {
    let url = "http://127.0.0.1:5000/api/arcadia/save"
    let xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
        console.log(xhr.responseText);
    }};

    let data = `{
    "Id": 78912,
    "Customer": "Jason Sweet",
    "Quantity": 1,
    "Price": 18.00
    }`;

    xhr.send(data);
})