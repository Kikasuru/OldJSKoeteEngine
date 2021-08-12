export function getButtonName(num) {
    return String.fromCharCode(65 + num);
}

export function getButtonNum(char) {
    return char.charCodeAt(0) - 65;
}

export class CommandStage {
    constructor(input, canHold, maxBuf, charge = 1) {
        this.input = input;
        this.canHold = canHold;
        this.maxBuf = maxBuf;
        this.charge = charge;
    }
}

export class Command {
    _stage = 0;
    _charge = 0;
    _buffStg = 0;
    _buffer = -1;

    constructor(stages) {
        this.stages = stages;
    }

    get active() {
        return this.stages.length <= this._stage && this._buffer > 0;
    }

    doFrame(input) {
        let curr = this.stages[this._stage < this.stages.length ? this._stage : this.stages.length - 1];

        // Decrement the buffer if it's currently active
        if (this._buffer > 0) {
            this._buffer--;
        }

        // Go through each character in the input
        let btnAct = false;
        const numReg = /[0-9]/
        for (let i = 0; i < curr.input.length; i++) {
            // Test for number, signalling a stick
            if (numReg.test(curr.input[i])) {
                btnAct = curr.input[i] == input.stick;
            // Input is a button
            } else {
                btnAct = input.btns[getButtonNum(curr.input[i])];
            }

            // Break out of the for loop if a match has already been found
            if (btnAct) break;
        }

        // If the buffer has depleted, destroy the chain
        if (this._buffer <= 0) {
            if (curr.charge <= 1) this._charge = 0;
            if (!btnAct) {
                this._buffer = -1
                this._stage = 0;
                this._buffStg = 0;
            }
        }

        // Advance charge
        if (btnAct && this._charge < curr.charge) this._charge++;

        // If the button is held and the buffer is -1 or if the input can be held
        if ((this._charge >= curr.charge) && ((this._buffer === -1 || this._stage !== this._buffStg) || curr.canHold)) {
            // Set the buffer to max
            this._buffer = curr.maxBuf;

            if (!curr.canHold || (curr.canHold && !btnAct)) {
                // Reset the charge
                this._charge = 0;

                // Advance the stage
                this._buffStg = this._stage;
                if (this._stage < this.stages.length) this._stage++;
            }
        }

        // If no button is being pressed, reset the charge
        if (!btnAct) this._charge = 0;
    }
}
