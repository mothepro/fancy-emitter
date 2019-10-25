
import { Emitter } from '../index'

// HTML elements
const txtInput          = document.getElementById('txt') as HTMLInputElement
const activateButton    = document.getElementById('activate') as HTMLButtonElement
const deactivateButton  = document.getElementById('deactivate') as HTMLButtonElement
const cancelButton      = document.getElementById('cancel') as HTMLButtonElement
const logElements = [
    document.getElementById('log1') as HTMLPreElement,
    document.getElementById('log2') as HTMLPreElement,
] as const

/** Adds a log entry to a <pre> element. */
function log(element: HTMLPreElement, data: string) {
    element.innerHTML += '\n' + data
}

const txtEmitter = new Emitter<string>()

activateButton.onclick      = () => txtEmitter.activate(txtInput.value)
deactivateButton.onclick    = () => txtEmitter.deactivate(Error('stopped by user'))
cancelButton.onclick        = txtEmitter.cancel

/** Logs events from the txtEmitter to a <pre> element. */
async function startLoggingTxt(element: HTMLPreElement) {
    log(element, 'START')
    try {
        for await (const data of txtEmitter)
            log(element, `>\t${data}`)
    } catch (error) {
        log(element, `ERR >\t${error}`)
    }
    log(element, 'FINISH')
}

startLoggingTxt(logElements[0])
startLoggingTxt(logElements[1])
