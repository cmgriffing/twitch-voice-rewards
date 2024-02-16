import { atomWithStorage } from "jotai/utils";

export const channelNameState = atomWithStorage("channelName", "");
export const vapiAssistantIdState = atomWithStorage("vapiAssistantId", "");
export const vapiPublicKeyState = atomWithStorage("vapiPublicKey", "");

export const shouldTriggerBitsState = atomWithStorage(
  "shouldTriggerBits",
  true
);
export const minBitsState = atomWithStorage("minBits", 100);

export const shouldTriggerSubsState = atomWithStorage(
  "shouldTriggerSubs",
  false
);

export const shouldTriggerGiftsState = atomWithStorage(
  "shouldTriggerGifts",
  false
);

export const shouldTriggerRaidsState = atomWithStorage(
  "shouldTriggerRaids",
  false
);
export const minRaidersState = atomWithStorage("minRaiders", 10);
