import * as Tone from "tone"

document.querySelector("#start-button").addEventListener("click", () => {
    document.querySelector("#start-button").remove()
    const main = document.querySelector("#main-controls") as HTMLDivElement
    main.style.display = "block"
    Tone.start().then(() => {
        console.log("Started!")
    })
    getMidiOuts()
    for (const string of strings) string.createUI()
})

let midiOut: WebMidi.MIDIOutput = null
let midiAccess: WebMidi.MIDIAccess = null

let outSynth = null

function getMidiOuts() {
    midiOut = null
    outSynth = null

    navigator.requestMIDIAccess().then(midi => {
        midiAccess = midi

        const outs = midi.outputs

        const selector = document.querySelector("#midi-select")

        selector.innerHTML = `
            <option>--- Select MIDI Output ---</option>
            <option>Browser synth</option>
        `

        for (const out of Array.from(outs.values())) {
            if (out.name) {
                const option = document.createElement("option")
                option.innerText = out.name
                document.querySelector("#midi-select").appendChild(option)
            }
        }
    })
}

document.querySelector("#midi-select").addEventListener("input", e => {
    midiOut = null
    outSynth = null

    if (e.target instanceof HTMLSelectElement) {
        if (e.target.value == "Browser synth") {
            outSynth = new Tone.PolySynth({
                polyphony: 8
            }).connect(new Tone.Gain(0.5).toMaster())
        }

        if (!midiAccess) return alert(`Could not connect to MIDI!`)
        for (const out of Array.from(midiAccess.outputs.values())) {
            if (out.name == e.target.value) {
                alert(`Connected to MIDI out "${e.target.value}"`)
                midiOut = out
            }
        }
    }
})

const fileInput = document.createElement("input")
fileInput.type = "file"
fileInput.addEventListener("change", replaceImage)

const canvas = document.createElement("canvas")

canvas.width = 800
canvas.height = 600

const ctx = canvas.getContext("2d")

document.querySelector("#canvas-container").appendChild(canvas)

const imageCanvas = document.createElement("canvas")
const imageCtx = imageCanvas.getContext("2d")

const defaultImage = new Image()
defaultImage.src = require("./default/bird-img.png")
setImage(defaultImage)

function setImage(img: HTMLImageElement) {
    img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height

        imageCanvas.width = img.width
        imageCanvas.height = img.height

        imageCtx.drawImage(img, 0, 0)
    }
}

function replaceImage(e) {
    console.log(e)

    const reader = new FileReader()
    reader.onload = event => {
        if (typeof event.target.result != "string") return
        var img = new Image()
        setImage(img)
        img.src = event.target.result
    }
    reader.readAsDataURL(e.target.files[0])
}

document.querySelector("#load-image").addEventListener("click", () => {
    fileInput.click()
})

let showBars = false

document.querySelector("#toggle-bars").addEventListener("click", () => {
    showBars = !showBars
})

class LightDetector {
    // The current state  of the detector
    isLight: boolean = true

    darkThresh: number = 0.4
    lightThresh: number = 0.6
    prev = 0.5

    update(lightLevel: number, onLight = () => {}, onDark = () => {}) {
        if (this.isLight) {
            if (lightLevel < this.darkThresh) {
                this.isLight = false
                onDark()
            }
        } else {
            if (lightLevel > this.lightThresh) {
                this.isLight = true
                onLight()
            }
        }
        this.prev = lightLevel
    }
}

const createButton = (text: string, onClick = () => {}) => {
    const button = document.createElement("div")
    button.className = "button"
    button.innerText = text
    button.addEventListener("click", onClick)
    return button
}

const createSlider = (label: string, onValue = (value: number) => {}) => {
    const row = document.createElement("div")
    row.className = "slider-row"
    const labelEle = document.createElement("div")
    labelEle.innerText = label
    row.appendChild(labelEle)
    const slider = document.createElement("input")
    slider.className = "slider"
    slider.type = "range"
    slider.min = "0"
    slider.max = "1"
    slider.step = "0.0001"
    slider.value = "0.5"
    row.appendChild(slider)
    slider.addEventListener("input", () => onValue(parseFloat(slider.value)))
    onValue(parseFloat(slider.value))
    return row
}

const noteNames = "C C# D D# E F F# G G# A A# B".split(" ")

const createNotePicker = (onMidi = (name: string, num: number) => {}) => {
    const row = document.createElement("div")
    row.className = "note-pick-row"

    const labelEle = document.createElement("div")
    labelEle.innerText = "MIDI Note"
    row.appendChild(labelEle)

    const update = () => {
        const num =
            noteNames.indexOf(noteSel.value) + (parseInt(octSel.value) + 2) * 12
        onMidi(`${noteSel.value}${octSel.value}`, num)
    }

    const noteSel = document.createElement("select")
    for (const note of noteNames) {
        const option = document.createElement("option")
        option.innerText = note
        noteSel.appendChild(option)
        noteSel.addEventListener("input", update)
    }
    row.appendChild(noteSel)

    const octSel = document.createElement("select")
    for (let i = -2; i < 8; i++) {
        const option = document.createElement("option")
        option.innerText = i + ""
        octSel.appendChild(option)
        octSel.addEventListener("input", update)
    }
    row.appendChild(octSel)

    return row
}

const colors = ["#f35", "#e73", "#ea4", "#3b5", "#64e", "#d3d"]

// Represents a particular line / string in an image
class Line {
    static nextHue = 0

    // The MIDI note that this line emits when triggered
    noteName: string = "C-2"
    noteNum: number = 0

    detector = new LightDetector()

    container: HTMLDivElement = null

    color: string = null

    constructor(
        public startPos: number = 0.5,
        public endPos: number = 0.5,
        public radius = 100
    ) {
        this.color = colors[Line.nextHue % colors.length]
        Line.nextHue += 1
    }

    createUI() {
        if (this.container) return
        this.container = document.createElement("div")
        this.container.className = "box"

        this.container.style.setProperty("--color", this.color)

        this.container.appendChild(
            createNotePicker((name, num) => {
                this.noteName = name
                this.noteNum = num
            })
        )

        this.container.appendChild(
            createSlider("Start Pos", x => (this.startPos = x))
        )
        this.container.appendChild(
            createSlider("End Pos", x => (this.endPos = x))
        )
        this.container.appendChild(
            createSlider("Radius", x => (this.radius = x * 100 + 5))
        )
        this.container.appendChild(
            createSlider("Light Thresh", x => (this.detector.lightThresh = x))
        )
        this.container.appendChild(
            createSlider("Dark Thresh", x => (this.detector.darkThresh = x))
        )

        this.container.appendChild(
            createButton("Remove string", () => {
                strings = strings.filter(string => string != this)
                this.destroyUI()
            })
        )

        document.getElementById("controls").appendChild(this.container)
    }

    destroyUI() {
        this.container.remove()
        this.container = null
    }
}

let strings: Line[] = []

document.querySelector("#make-string").addEventListener("click", () => {
    const string = new Line()
    string.createUI()
    strings.push(string)
})

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.drawImage(imageCanvas, 0, 0)

    const interval = 5000
    const intervalProgress = (Date.now() % interval) / interval
    let currentX = Math.floor(intervalProgress * canvas.width)

    let i = 0
    for (const string of strings) {
        const startY = canvas.height * string.startPos
        const endY = canvas.height * string.endPos

        const currentY = startY + (endY - startY) * intervalProgress

        const size = Math.round(string.radius)

        const sampleImage = imageCtx.getImageData(
            currentX - string.radius,
            currentY - string.radius,
            size * 2,
            size * 2
        )

        let total = 0

        for (let i = 0; i < sampleImage.data.length; i += 4) {
            const r = sampleImage.data[i]
            const g = sampleImage.data[i + 1]
            const b = sampleImage.data[i + 2]
            const a = sampleImage.data[i + 3]
            if (a == 0) {
                total += 1
            } else {
                total += (r + g + b) / (3 * 255)
            }
        }

        const avg = total / Math.pow(size * 2, 2)

        const onLight = () => {
            // TODO: Add a switch to enable detecting light things!
        }
        const onDark = () => {
            if (midiOut) {
                midiOut.send([0b10010000, string.noteNum, 127])
                setTimeout(() => {
                    midiOut.send([0b10000000, string.noteNum, 127])
                }, 250)
            }

            if (outSynth) {
                outSynth.triggerAttackRelease(string.noteName, "16n")
            }
        }

        string.detector.update(avg, onLight, onDark)

        ctx.strokeStyle = string.color
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(0, startY)
        ctx.lineTo(canvas.width, endY)
        ctx.stroke()

        ctx.globalCompositeOperation = "multiply"
        ctx.fillStyle = string.color
        ctx.beginPath()
        ctx.arc(currentX, currentY, string.radius, 0, 2 * Math.PI)
        ctx.fill()
        ctx.globalCompositeOperation = "source-over"

        if (!string.detector.isLight) {
            ctx.strokeStyle = "#fff"
            ctx.lineWidth = 5
            ctx.beginPath()
            ctx.arc(currentX, currentY, string.radius, 0, 2 * Math.PI)
            ctx.stroke()
        }

        if (showBars) {
            const barHeight = 20
            const barY = i * barHeight
            ctx.fillStyle = string.color
            ctx.fillRect(0, i * barHeight, canvas.width, barHeight)

            const darkThresh = string.detector.darkThresh
            ctx.fillStyle = "#000"
            ctx.fillRect(canvas.width * darkThresh - 2, barY, 4, barHeight)

            const lightThresh = string.detector.lightThresh
            ctx.fillStyle = "#fff"
            ctx.fillRect(canvas.width * lightThresh - 2, barY, 4, barHeight)

            const prev = string.detector.prev
            ctx.beginPath()
            ctx.arc(
                canvas.width * prev - 2,
                barY + barHeight / 2,
                barHeight / 2,
                0,
                2 * Math.PI
            )
            ctx.fill()
        }

        i++
    }

    requestAnimationFrame(loop)
}

loop()
