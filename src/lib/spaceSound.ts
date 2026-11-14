import { readFlag, writeFlag } from './storage'

/*
 * A quiet ambient soundscape, generated in the browser (no audio files): a low drone, a slowly
 * breathing filtered rumble, and a faint high shimmer. From MapaMars. On by default, remembered
 * when turned off.
 */

const ENABLED_KEY = 'mapa.spaceSound'
/** Overall loudness, 0..1. Kept low: background atmosphere, not something to turn down. */
const VOLUME = 0.07
const FADE_IN_S = 4
const FADE_OUT_S = 1.2

let ctx: AudioContext | null = null
let master: GainNode | null = null
let enabled = readFlag(ENABLED_KEY, true)
const listeners = new Set<(on: boolean) => void>()

export const isSpaceSoundOn = () => enabled
export function onSpaceSoundChange(listener: (on: boolean) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Two seconds of brown noise (random steps, so it rumbles rather than hisses), looped. */
function brownNoise(context: AudioContext) {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    data[i] = last * 3.5
  }
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true
  return source
}

/** A very slow sine that nudges `param` up and down by `depth` around its value. */
function wobble(context: AudioContext, param: AudioParam, rate: number, depth: number) {
  const lfo = context.createOscillator()
  lfo.frequency.value = rate
  const amount = context.createGain()
  amount.gain.value = depth
  lfo.connect(amount).connect(param)
  lfo.start()
}

function build() {
  const context = new AudioContext()
  const out = context.createGain()
  out.gain.value = 0
  out.connect(context.destination)

  // Deep rumble: brown noise through a low-pass whose cutoff drifts, like distant wind
  const rumbleFilter = context.createBiquadFilter()
  rumbleFilter.type = 'lowpass'
  rumbleFilter.frequency.value = 260
  rumbleFilter.Q.value = 0.6
  wobble(context, rumbleFilter.frequency, 0.045, 110)
  const rumbleGain = context.createGain()
  rumbleGain.gain.value = 0.55
  const rumble = brownNoise(context)
  rumble.connect(rumbleFilter).connect(rumbleGain).connect(out)
  rumble.start()

  // Drone: a low fifth (A1 and E2) with a soft octave, slightly detuned so it slowly beats
  const droneFilter = context.createBiquadFilter()
  droneFilter.type = 'lowpass'
  droneFilter.frequency.value = 420
  const droneGain = context.createGain()
  droneGain.gain.value = 0.16
  wobble(context, droneGain.gain, 0.07, 0.05)
  droneFilter.connect(droneGain).connect(out)
  for (const [freq, type, level] of [[55, 'sine', 1], [82.6, 'sine', 0.6], [110.4, 'triangle', 0.22]] as const) {
    const osc = context.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    const g = context.createGain()
    g.gain.value = level
    osc.connect(g).connect(droneFilter)
    osc.start()
  }

  // Shimmer: a thin band of noise high up, swelling and fading very slowly
  const shimmerFilter = context.createBiquadFilter()
  shimmerFilter.type = 'bandpass'
  shimmerFilter.frequency.value = 1900
  shimmerFilter.Q.value = 9
  wobble(context, shimmerFilter.frequency, 0.02, 500)
  const shimmerGain = context.createGain()
  shimmerGain.gain.value = 0.05
  wobble(context, shimmerGain.gain, 0.03, 0.04)
  const shimmer = brownNoise(context)
  shimmer.connect(shimmerFilter).connect(shimmerGain).connect(out)
  shimmer.start()

  return { context, out }
}

function fadeTo(level: number, seconds: number) {
  if (!ctx || !master) return
  const now = ctx.currentTime
  master.gain.cancelScheduledValues(now)
  master.gain.setValueAtTime(master.gain.value, now)
  master.gain.linearRampToValueAtTime(level, now + seconds)
}

function play() {
  if (!ctx) {
    const built = build()
    ctx = built.context
    master = built.out
  }
  void ctx.resume().then(() => fadeTo(VOLUME, FADE_IN_S))
}

function pause() {
  if (!ctx) return
  fadeTo(0, FADE_OUT_S)
  const c = ctx
  setTimeout(() => {
    if (!enabled) void c.suspend()
  }, FADE_OUT_S * 1000 + 100)
}

/** Turn the sound on or off (remembered between visits). Call from a click so the browser allows audio. */
export function setSpaceSound(on: boolean) {
  enabled = on
  writeFlag(ENABLED_KEY, on)
  if (on) play()
  else pause()
  for (const l of listeners) l(on)
}

/**
 * Browsers only allow sound after the visitor interacts with the page, so start on the first click,
 * tap or key press (when the sound is on). Call once when the app starts.
 */
export function startSpaceSoundOnFirstGesture() {
  const start = () => {
    window.removeEventListener('pointerdown', start)
    window.removeEventListener('keydown', start)
    if (enabled) play()
  }
  window.addEventListener('pointerdown', start)
  window.addEventListener('keydown', start)
  return () => {
    window.removeEventListener('pointerdown', start)
    window.removeEventListener('keydown', start)
  }
}
