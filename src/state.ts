import { atomWithStorage } from "jotai/utils";

export const minBitsState = atomWithStorage("minBits", 100);
export const channelNameState = atomWithStorage("channelName", "");
export const vapiAssistantIdState = atomWithStorage("vapiAssistantId", "");
export const vapiPublicKeyState = atomWithStorage("vapiPublicKey", "");
