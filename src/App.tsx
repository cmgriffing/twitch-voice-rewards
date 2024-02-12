import { useEffect, useState } from "react";
import Vapi from "@vapi-ai/web";
import { Input, Flex, Text, PasswordInput, Checkbox } from "@mantine/core";

import "./App.css";
import tmi from "tmi.js";

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

async function initiateVapiResponse(
  channel: string,
  username: string,
  usedBits: number,
  minBits: number,
  vapiAssistantId: string,
  vapiPublicKey: string,
  vapiInstance?: Vapi
) {
  if (minBits < 1) {
    console.log("Min Bits must be greater than 1.");
    return;
  }

  if (usedBits >= minBits) {
    // do the vapi thing
    if (vapiInstance) {
      try {
        await vapiInstance.start(vapiAssistantId);
        await vapiInstance.send({
          type: "add-message",
          message: {
            role: "user",
            content: `The username is ${username}`,
          },
        });
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

function App() {
  const [channelName, setChannelName] = useState("");
  const [vapiPublicKey, setVapiPublicKey] = useState("");
  const [vapiAssistantId, setVapiAssistantId] = useState("");
  const [minBits, setMinBits] = useState(100);
  const [vapiInstance, setVapiInstance] = useState<Vapi>();
  const [isDebugging, setIsDebugging] = useState(false);

  useEffect(() => {
    const client = new tmi.Client({
      options: { debug: true },
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
              const usedBits = parseInt(userstate?.bits, 10);
              await initiateVapiResponse(
                channelName,
                userstate.username,
                usedBits,
                minBits,
                vapiAssistantId,
                vapiPublicKey,
                vapiInstance
              );
            }
          } catch (e: unknown) {
            console.log("Error in CHEER:", e);
          }
        });

        if (isDebugging) {
          client.on("message", async (channel, userstate, message) => {
            try {
              console.log("MESSAGE:", { channel, userstate, message });

              if (userstate?.bits && userstate.username) {
                const usedBits = 100;
                await initiateVapiResponse(
                  channelName,
                  userstate.username,
                  usedBits,
                  minBits,
                  vapiAssistantId,
                  vapiPublicKey,
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
      });

      vapi.on("speech-end", () => {
        console.log("Speech has ended");
        // is this the right place?
        vapi.stop();
      });

      vapi.on("call-start", () => {
        console.log("Call has started");
      });

      vapi.on("call-end", () => {
        console.log("Call has stopped");
      });

      vapi.on("volume-level", (volume) => {
        console.log(`Assistant volume level: ${volume}`);
      });

      // Function calls and transcripts will be sent via messages
      vapi.on("message", (message) => {
        console.log(message);
      });

      vapi.on("error", (e) => {
        console.error(e);
      });

      setVapiInstance(vapi);
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
      </Flex>
    </Flex>
  );
}

export default App;
