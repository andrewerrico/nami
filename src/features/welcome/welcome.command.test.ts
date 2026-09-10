import { InteractionContextType, PermissionFlagsBits } from "discord.js";
import { describe, expect, it } from "vitest";

import { describeStatus, welcome } from "./welcome.command.js";

describe("welcome command", () => {
  it("is named and described for the command picker", () => {
    expect(welcome.data.name).toBe("welcome");
    expect(welcome.data.description.length).toBeGreaterThan(0);
  });

  it("serialises to a valid application command payload", () => {
    expect(welcome.data.toJSON()).toMatchObject({ name: "welcome" });
  });

  it("offers exactly the three subcommands", () => {
    const options = welcome.data.toJSON().options ?? [];
    expect(options.map((option) => option.name)).toEqual([
      "set-channel",
      "disable",
      "status",
    ]);
  });

  /* Hard rule #9. The default is what Discord shows an admin in its own
     permissions UI; getting it wrong means every member can repoint the
     welcome channel until someone notices. */
  it("defaults to Manage Server, not to everyone", () => {
    expect(welcome.data.toJSON().default_member_permissions).toBe(
      String(PermissionFlagsBits.ManageGuild),
    );
  });

  it("is offered in guilds only", () => {
    expect(welcome.data.toJSON().contexts).toEqual([InteractionContextType.Guild]);
  });

  it("requires a channel to set one", () => {
    const setChannel = (welcome.data.toJSON().options ?? []).find(
      (option) => option.name === "set-channel",
    );
    expect(setChannel).toMatchObject({ options: [{ name: "channel", required: true }] });
  });
});

describe("welcome status wording", () => {
  it("says how to turn the feature on when it is off", () => {
    expect(describeStatus({ kind: "disabled" })).toContain("/welcome set-channel");
  });

  it("names the channel it is posting to", () => {
    expect(describeStatus({ kind: "ok", channelId: "42" })).toContain("<#42>");
  });

  /* Both failure states have to name the fix. "It doesn't work" with no next
     step is what sends an admin to read the source. */
  it("tells an admin what to do about a deleted channel", () => {
    const text = describeStatus({ kind: "missing", channelId: "42" });
    expect(text).toContain("no longer exists");
    expect(text).toContain("/welcome set-channel");
  });

  it("names the missing permissions rather than just failing", () => {
    const text = describeStatus({ kind: "unwritable", channelId: "42" });
    expect(text).toContain("View Channel");
    expect(text).toContain("Send Messages");
  });
});
