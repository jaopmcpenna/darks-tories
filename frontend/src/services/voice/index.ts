/**
 * Voice service - unified interface for voice functionality
 */

export { AudioCapture, type AudioCaptureOptions } from './audioCapture'
export { transcribeAudio, type TranscribeResponse } from './stt'
export {
  synthesizeSpeech,
  synthesizeSpeechStream,
  playAudio,
  stopAudio,
  type SynthesizeOptions,
} from './tts'

