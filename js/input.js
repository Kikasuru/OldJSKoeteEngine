let config = null;

const configFile = "../config.json";
export function loadConfig() {
    return new Promise((res, rej) => {
        $.getJSON(configFile, (data) => {
            config = data;
            res("Config Loaded.");
        }).fail((err) => {
            console.error(err);
            rej(err);
        });
    });
}

export function getButtonName(num) {
    return String.fromCharCode(65 + num);
}

export function getButtonCount() {
    // Check if the config has loaded
    if (!config) {
        console.error("[ERR] Config hasn't been loaded!");
        return false;
    }

    return config.btnNum;
}

class InputState {
    constructor(up, down, left, right, buttons) {
        // Get the stick state
        this.stick = 5;

        if (up)     this.stick += 3;
        if (down)   this.stick -= 3;
        if (left)   this.stick -= 1;
        if (right)  this.stick += 1;

        // Special case for SOCD cleaning
        if (up & down) this.stick += 3;

        // Set the buttons
        this.btns = buttons;
    }
}

class InputDevice {
    constructor(name, active) {
        // Check if the config has loaded
        if (!config) {
            console.error("[ERR] Config hasn't been loaded!");
            return;
        }

        this.name = name;
        this.active = active;
    }

    doInputFrame() {
        // Check if the config has loaded
        if (!config) {
            console.error("[ERR] Config hasn't been loaded!");
            return;
        }

        return new InputState(false, false, false, false, Array.from({length: config.btnNum}, () => false));
    }
}

let keysPressed = {};

$(window).keydown((e) => {
    keysPressed[e.code] = true;
});

$(window).keyup((e) => {
    keysPressed[e.code] = false;
});

export class KeyboardDevice extends InputDevice {
    constructor() {
        super("input-keyboard", true);

        this.config = config.defaultKeyboard;
    }

    doInputFrame() {
        // Check if the config has loaded
        if (!config) {
            console.error("[ERR] Config hasn't been loaded!");
            return;
        }

        return new InputState(
            keysPressed[this.config.up],
            keysPressed[this.config.down],
            keysPressed[this.config.left],
            keysPressed[this.config.right],

            Array.from({length: config.btnNum}, (e, i) => e = keysPressed[this.config.btns[i]])
        )
    }
}

export class GamepadDevice extends InputDevice {
    constructor(gamepad) {
        super(gamepad.id, true);

        this.config = config.defaultGamepad;
        this.gamepad = gamepad.index;
    }

    checkButton(btn) {
        if (typeof(btn) == "object") {
            return btn.value >= this.config.sensitivity || btn.pressed;
        }
        return b >= this.config.sensitivity;
    }

    doInputFrame() {
        // Check if the config has loaded
        if (!config) {
            console.error("[ERR] Config hasn't been loaded!");
            return;
        }

        let gp = navigator.getGamepads()[this.gamepad];

        if (this.config.useaxis) {
            return new InputState(
                gamepad.axis[this.config.yaxis] >= this.config.sensitivity,
                gamepad.axis[this.config.yaxis] <= this.config.sensitivity * -1,
                gamepad.axis[this.config.xaxis] >= this.config.sensitivity,
                gamepad.axis[this.config.xaxis] <= this.config.sensitivity * -1,

                Array.from({length: config.btnNum}, (e, i) => e = this.checkButton(gp.buttons[this.config.btns[i]]))
            )
        } else {
            return new InputState(
                this.checkButton(gp.buttons[this.config.up]),
                this.checkButton(gp.buttons[this.config.down]),
                this.checkButton(gp.buttons[this.config.left]),
                this.checkButton(gp.buttons[this.config.right]),

                Array.from({length: config.btnNum}, (e, i) => e = this.checkButton(gp.buttons[this.config.btns[i]]))
            )
        }
    }
}

export class InputHandler {
    static inputs = {}
    static activeGp = [null, null]

    static get gp() {
        return [
            this.activeGp[0] !== null ? this.inputs[this.activeGp[0]] : null,
            this.activeGp[1] !== null ? this.inputs[this.activeGp[1]] : null
        ];
    }

    static gamepadHandler(event, connecting) {
        let gamepad = event.gamepad;

        if (connecting) {
            this.inputs[gamepad.index] = new GamepadDevice(gamepad);
            for (let i = 0; i < this.activeGp.length; i++) {
                if (this.activeGp[i] === null) {
                    this.activeGp[i] = gamepad.index;
                    break;
                }
            }
        } else {
            for (let i = 0; i < this.activeGp.length; i++) {
                if (this.activeGp[i] === gamepad.index) this.activeGp[i] = null;
            }
            delete this.inputs[gamepad.index];
        }
    }

    static keyboardHandler(connecting) {
        if (connecting) {
            this.inputs["keyboard"] = new KeyboardDevice();
            if (this.activeGp.includes("keyboard")) return;

            for (let i = 0; i < this.activeGp.length; i++) {
                if (this.activeGp[i] === null) {
                    this.activeGp[i] = "keyboard";
                    break;
                }
            }
        } else {
            for (let i = 0; i < this.activeGp.length; i++) {
                if (this.activeGp[i] === "keyboard") this.activeGp[i] = null;
            }
            delete this.inputs["keyboard"];
        }
    }

    static enableHandlers() {
        window.addEventListener("gamepadconnected", function(e) { InputHandler.gamepadHandler(e, true); }, false);
        window.addEventListener("gamepaddisconnected", function(e) { InputHandler.gamepadHandler(e, false); }, false);

        window.addEventListener("keydown", function(e) { InputHandler.keyboardHandler(true); }, false);
    }
}
