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

import { SafeEmitter, Emitter } from '../index'

const txtEmitter = new Emitter<string>()
const keyEmitter = new SafeEmitter<KeyboardEvent>()

activateButton.onclick      = () => txtEmitter.activate(txtInput.value)
deactivateButton.onclick    = () => txtEmitter.deactivate(Error('stopped by user'))
cancelButton.onclick        = txtEmitter.cancel

/** Logs events from the txtEmitter to a <pre> element. */
async function startLoggingTxt(element: HTMLPreElement) {
    log(element, 'START logging input fields')
    try {
        for await (const data of txtEmitter)
            log(element, `>\t${data}`)
    } catch (error) {
        log(element, `ERR >\t${error}`)
    }
    log(element, 'FINISH')
}

startLoggingTxt(logElements[0]) // Since top level await isn't supported yet.

// Logs events from the keyEmitter to a <pre> element.
txtInput.onkeydown = keyEmitter.activate
log(logElements[1], 'START logging keyboard events')
keyEmitter
    .on(({ key, code }) => log(logElements[1], `>\tKey: "${key}"\tCode: "${code}"`))
    .catch(() => log(logElements[1], 'SafeEmitters can not throw, so this will never happen'))

