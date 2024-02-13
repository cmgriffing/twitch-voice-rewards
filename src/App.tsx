import { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import { Input, Flex, Text, PasswordInput, Checkbox } from "@mantine/core";
import { useAtom } from "jotai";
import debounce from "lodash.debounce";

import "./App.css";
import tmi from "tmi.js";
import {
  channelNameState,
  minBitsState,
  vapiAssistantIdState,
  vapiPublicKeyState,
} from "./state";

const userCache: Record<string, number> = {};

/*

fields needed for config

// - channel

// non twitch
// MVP
- Vapi API key
- Vapi Assistant ID

// POST MVP
- Vapi API key
- create Assistant and evaluate, then kill it

*/

function sendMessageToVapi(vapi: Vapi, username?: string) {
  if (username) {
    vapi.send({
      type: "add-message",
      message: {
        role: "user",
        content: `The username is ${username}`,
      },
    });
  }
}

const userCacheTTL = 60 * 1000;

// uses global state for simplicity for now
async function initiateVapiResponse(
  channel: string,
  username: string,
  usedBits: number,
  minBits: number,
  vapiAssistantId: string,
  vapiPublicKey: string,
  userQueue: { current: string[] },
  vapiInstance?: Vapi
) {
  if (minBits < 1) {
    console.log("Min Bits must be greater than or equal 1.");
    return;
  }

  if (usedBits >= minBits) {
    // do the vapi thing
    if (vapiInstance) {
      try {
        // user caching to prevent messages too often. maybe temporary
        if (
          userCache[username] &&
          Date.now() < userCache[username] + userCacheTTL
        ) {
          console.log("User is still in cache:", username);
          return;
        } else {
          userCache[username] = Date.now();
        }

        if (userQueue.current.length < 1) {
          await vapiInstance.start(vapiAssistantId);
        }

        userQueue.current.push(username);
        console.log("pushed to queue", userQueue.current);
      } catch (e: unknown) {
        console.log("Error starting assistant or sending message.", e);
      }
    } else {
      console.log("No vapiInstance found. Were all fields filled out?", {
        channel,
        vapiAssistantId,
        vapiPublicKey,
      });
    }
  }
}

function handleSpeechEnd(
  queue: { current: string[] },
  vapi: Vapi,
  isSpeaking: { current: boolean }
) {
  if (isSpeaking.current) {
    console.log("Still speaking, bailing out of speech end");
    return;
  }

  console.log("queue after shift: ", queue.current);

  const username = queue.current.shift();

  console.log("queue after shift: ", queue.current);

  if (username) {
    sendMessageToVapi(vapi, username);
  } else {
    // is this the right place?
    vapi.stop();
  }
}

const speechEndHandler = debounce(handleSpeechEnd, 5000);

function App() {
  const [channelName, setChannelName] = useAtom(channelNameState);
  const [vapiPublicKey, setVapiPublicKey] = useAtom(vapiPublicKeyState);
  const [vapiAssistantId, setVapiAssistantId] = useAtom(vapiAssistantIdState);
  const [minBits, setMinBits] = useAtom(minBitsState);
  const [vapiInstance, setVapiInstance] = useState<Vapi>();
  const [isDebugging, setIsDebugging] = useState(false);
  const userQueue = useRef<string[]>([]);
  const isSpeaking = useRef(false);

  useEffect(() => {
    const client = new tmi.Client({
      // options: { debug: true },
      // identity: {
      //   username: 'bot_name',
      //   password: 'oauth:my_bot_token'
      // },
      channels: [channelName],
    });

    async function connectClient() {
      try {
        await client.connect();

        client.on("cheer", async (channel, userstate, message) => {
          try {
            console.log("CHEER:", { channel, userstate, message });
            if (userstate?.bits && userstate.username) {
              const usedBits = parseInt(userstate?.bits || "0", 10);
              await initiateVapiResponse(
                channelName,
                userstate.username,
                usedBits,
                minBits,
                vapiAssistantId,
                vapiPublicKey,
                userQueue,
                vapiInstance
              );
            }
          } catch (e: unknown) {
            console.log("Error in CHEER:", e);
          }
        });

        client.on(
          "subscription",
          async (channel, username, method, message, userstate) => {
            console.log("SUBSCRIPTION", {
              channel,
              username,
              method,
              message,
              userstate,
            });

            await initiateVapiResponse(
              channelName,
              userstate.username,
              minBits + 1,
              minBits,
              vapiAssistantId,
              vapiPublicKey,
              userQueue,
              vapiInstance
            );
          }
        );

        client.on(
          "subgift",
          async (
            channel,
            username,
            streakMonths,
            recipient,
            methods,
            userstate
          ) => {
            console.log("SUBGIFT", {
              channel,
              username,
              streakMonths,
              recipient,
              methods,
              userstate,
            });

            const giftedUsername: string =
              userstate["msg-param-recipient-display-name"] ??
              userstate["msg-param-recipient-user-name"] ??
              "";

            if (giftedUsername) {
              await initiateVapiResponse(
                channelName,
                giftedUsername,
                minBits + 1,
                minBits,
                vapiAssistantId,
                vapiPublicKey,
                userQueue,
                vapiInstance
              );
            }
          }
        );

        client.on(
          "submysterygift",
          async (channel, username, numbOfSubs, methods, userstate) => {
            console.log("SUBMYSTERYGIFT", {
              channel,
              username,
              numbOfSubs,
              methods,
              userstate,
            });

            const giftedUsername: string =
              userstate["msg-param-recipient-display-name"] ??
              userstate["msg-param-recipient-user-name"] ??
              "";

            if (giftedUsername) {
              await initiateVapiResponse(
                channelName,
                giftedUsername,
                minBits + 1,
                minBits,
                vapiAssistantId,
                vapiPublicKey,
                userQueue,
                vapiInstance
              );
            }
          }
        );

        client.on(
          "subscription",
          async (channel, username, method, message, userstate) => {
            console.log("SUBSCRIPTION", {
              channel,
              username,
              method,
              message,
              userstate,
            });

            await initiateVapiResponse(
              channelName,
              userstate.username,
              minBits + 1,
              minBits,
              vapiAssistantId,
              vapiPublicKey,
              userQueue,
              vapiInstance
            );
          }
        );

        client.on(
          "resub",
          async (channel, username, method, message, userstate) => {
            console.log("RESUB", {
              channel,
              username,
              method,
              message,
              userstate,
            });

            await initiateVapiResponse(
              channelName,
              userstate.username,
              minBits + 1,
              minBits,
              vapiAssistantId,
              vapiPublicKey,
              userQueue,
              vapiInstance
            );
          }
        );

        // TODO: remove this?
        if (isDebugging) {
          client.on("message", async (channel, userstate, message) => {
            try {
              console.log("MESSAGE:", { channel, userstate, message });

              if (
                userstate.username &&
                !!userstate.subscriber
                //  && userstate.username === "cmgriffing"
              ) {
                const usedBits = 100;
                await initiateVapiResponse(
                  channelName,
                  userstate.username,
                  usedBits,
                  minBits,
                  vapiAssistantId,
                  vapiPublicKey,
                  userQueue,
                  vapiInstance
                );
              }
            } catch (e: unknown) {
              console.log("Error in MESSAGE:", e);
            }
          });
        }
      } catch (e: unknown) {
        console.log("Error connecting with TMI:", e);
      }
    }

    connectClient();

    return () => {
      const readyState = client.readyState();
      if (readyState === "OPEN" || readyState === "CONNECTING") {
        client.disconnect();
      }
    };
  }, [
    channelName,
    minBits,
    vapiInstance,
    vapiAssistantId,
    vapiPublicKey,
    isDebugging,
  ]);

  useEffect(() => {
    if (vapiPublicKey) {
      const vapi = new Vapi(vapiPublicKey);

      vapi.on("speech-start", () => {
        console.log("Speech has started");
        isSpeaking.current = true;
      });

      vapi.on("speech-end", async () => {
        console.log("Speech has ended");
        isSpeaking.current = false;

        speechEndHandler(userQueue, vapi, isSpeaking);
      });

      vapi.on("call-start", async () => {
        console.log("Call has started");

        const username = userQueue.current.shift();
        sendMessageToVapi(vapi, username);
      });

      vapi.on("call-end", () => {
        console.log("Call has stopped");
      });

      // vapi.on("volume-level", (volume) => {
      //   console.log(`Assistant volume level: ${volume}`);
      // });

      // Function calls and transcripts will be sent via messages
      // vapi.on("message", (message) => {
      //   console.log("message", message);
      // });

      vapi.on("error", (e) => {
        console.error(e);
      });

      setVapiInstance(vapi);
    } else {
      setVapiInstance(undefined);
    }
  }, [vapiPublicKey]);

  return (
    <Flex
      // direction="column"
      mih="100vh"
      miw="100vw"
      align={"center"}
      justify={"center"}
      gap="2rem"
    >
      <Flex w="400px" direction="column" gap="1rem">
        <Text size="xl" fw={700}>
          🦸‍♂️ SuperViewers 🦸‍♀️
        </Text>
        <Text>Imagine your Twitch viewers as superheroes!</Text>
        <Text ta={"left"} fw={600}>
          How It Works
        </Text>
        <Text ta={"left"}>
          When a viewer donates more bits than the minimum bits value, Superhero
          Me will look at their username and imagine them as a super hero. Using
          a natural sounding voice (hardcoded for now), it may talk about their
          powers and/or origin story or possibly even their visual aesthetic.
          This is all done using Vapi.ai's voice assistant functionality.
        </Text>
        <Text ta={"left"}>
          <Text fw={700}>Note: </Text>
          To use this bot, you will need to sign up for{" "}
          <a href="https://vapi.ai?rel=cmgriffing">Vapi.ai</a>
        </Text>
      </Flex>

      <Flex w="400px" direction="column" gap="1rem">
        <Flex direction="column" align={"flex-start"}>
          <Checkbox
            checked={isDebugging}
            label="Enable Debugging via regular messages"
            onChange={(e) => {
              setIsDebugging(e.currentTarget.checked);
            }}
          />
        </Flex>
        <Flex direction="column" align={"flex-start"}>
          <label htmlFor="channel-name">Channel Name</label>
          <Input
            w="100%"
            id="channel-name"
            name="channel-name"
            value={channelName}
            onChange={(e) => {
              setChannelName(e.currentTarget.value);
            }}
          />
        </Flex>

        <Flex direction="column" align={"flex-start"}>
          <label htmlFor="vapi-api-key">Vapi Public Key</label>
          <PasswordInput
            w="100%"
            id="vapi-api-key"
            name="vapi-api-key"
            value={vapiPublicKey}
            onChange={(e) => {
              setVapiPublicKey(e.currentTarget.value);
            }}
          />
        </Flex>

        <Flex direction="column" align={"flex-start"}>
          <label htmlFor="vapi-assistant-id">Vapi Assistant ID</label>
          <Input
            w="100%"
            id="vapi-assistant-id"
            name="vapi-assistant-id"
            value={vapiAssistantId}
            onChange={(e) => {
              setVapiAssistantId(e.currentTarget.value);
            }}
          />
        </Flex>

        <Flex>
          <Text fw={600}>Triggers</Text>
        </Flex>

        <Flex direction="column" align={"flex-start"}>
          <label htmlFor="min-bits">Minimum Bits</label>
          <Input
            w="100%"
            min={1}
            id="min-bits"
            name="min-bits"
            type="number"
            value={minBits}
            onChange={(e) => {
              setMinBits(e.currentTarget.valueAsNumber);
            }}
          />
        </Flex>
      </Flex>
    </Flex>
  );
}

export default App;
