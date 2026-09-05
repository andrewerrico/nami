import { describe, expect, it } from "vitest";

import { gatePassed, memberJoined } from "./welcome.event.js";
import { isGatePass } from "./welcome.event.js";

describe("welcome triggers", () => {
  it("listens on both arrival paths", () => {
    expect(memberJoined.name).toBe("guildMemberAdd");
    expect(gatePassed.name).toBe("guildMemberUpdate");
  });

  /* Neither handler is a one-shot. `once: true` here would welcome the first
     member after every deploy and nobody afterwards. */
  it("stays attached rather than firing once", () => {
    expect(memberJoined.once).toBeUndefined();
    expect(gatePassed.once).toBeUndefined();
  });
});

describe("isGatePass", () => {
  it("fires on the pending true to false transition", () => {
    expect(isGatePass(true, false)).toBe(true);
  });

  /* The trap ROADMAP.md flags: guildMemberUpdate also fires for nickname
     changes, role grants and expiring timeouts. Welcoming on any update would
     greet the same member every time they were given a role. */
  it("ignores an update that is not about the gate", () => {
    expect(isGatePass(false, false)).toBe(false);
  });

  it("ignores a member who is still behind the gate", () => {
    expect(isGatePass(true, true)).toBe(false);
  });

  /* Going false to true is not a real Discord transition, but treating it as
     an arrival would be exactly backwards. */
  it("ignores the transition running the other way", () => {
    expect(isGatePass(false, true)).toBe(false);
  });

  /* `pending` is blanked on a partial member. Unknown means "do not know it was
     a transition", so it must not welcome — a missed welcome is recoverable, a
     welcome on every update is not. */
  it("treats an unknown previous state as not an arrival", () => {
    expect(isGatePass(null, false)).toBe(false);
    expect(isGatePass(null, true)).toBe(false);
  });
});
